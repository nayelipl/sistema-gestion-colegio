import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";
import { obtenerSiguienteNumero } from "@/lib/contador-secuencial";
import { TipoMovimiento, EstadoCuenta, EstadoCargo } from "@prisma/client";
import { formatFechaLocal, formatHoraLocal } from "@/lib/formatear-fecha";
import { ajustarFechasAPI } from "@/lib/ajustar-fechas";

export async function POST(request: Request) {
  const permiso = await verificarPermiso(["ADMINISTRADOR", "CONTADOR", "CAJERO"]);
  if (permiso.error) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }

  try {
    const { estudianteId, tipo, rutaId, fechaInicio, observaciones } = await request.json();

    if (!estudianteId || !tipo) {
      return NextResponse.json(
        { error: "Faltan datos: estudianteId y tipo son requeridos" },
        { status: 400 }
      );
    }

    // 1. Obtener estudiante con tutor
    const estudiante = await prisma.estudiante.findUnique({
      where: { id: estudianteId },
      include: { 
        tutor: true,
      },
    });

    if (!estudiante) {
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
    }

    if (!estudiante.tutor) {
      return NextResponse.json({ error: "El estudiante no tiene un tutor asignado" }, { status: 400 });
    }

    // 2. Obtener año escolar activo con todas sus configuraciones
    const tarifaActiva = await prisma.tarifaAnioEscolar.findFirst({
      where: { activo: true },
      include: {
        configuracionesCuotas: {
          where: { tipo: "TRANSPORTE" },
          orderBy: { numeroCuota: "asc" },
        },
        tarifasTransporte: true,
      },
    });

    const anioEscolarActual = tarifaActiva?.anioEscolar;

    if (!anioEscolarActual || !tarifaActiva) {
      return NextResponse.json({ 
        error: "No hay un año escolar activo configurado. Configure la tarifa primero." 
      }, { status: 400 });
    }

    // 3. Verificar que el estudiante esté matriculado en el año escolar actual
    const matriculaActiva = await prisma.matricula.findFirst({
      where: {
        estudianteId,
        anioEscolar: anioEscolarActual,
      },
    });

    if (!matriculaActiva) {
      return NextResponse.json({ 
        error: `El estudiante ${estudiante.codigo} - ${estudiante.nombre} ${estudiante.apellido} no está matriculado en el año escolar ${anioEscolarActual}. Debe matricularse primero.` 
      }, { status: 400 });
    }

    // 4. Obtener tarifa de transporte para el tipo seleccionado
    const tarifaTransporteData = tarifaActiva.tarifasTransporte.find(
      (t) => t.tipo === tipo
    );

    if (!tarifaTransporteData) {
      return NextResponse.json({ 
        error: `No hay tarifa configurada para el tipo ${tipo} en el año escolar ${anioEscolarActual}` 
      }, { status: 400 });
    }

    const numCuotas = tarifaActiva.transporteNumCuotas;
    const valorAnual = Number(tarifaTransporteData.valorAnual);
    const valorCuota = valorAnual / numCuotas;
    
    let fechaInicioDate = new Date();
    if (fechaInicio) {
      const { fechaDesde: fechaAjustada } = ajustarFechasAPI(fechaInicio, undefined);
      fechaInicioDate = fechaAjustada || new Date(fechaInicio);
    }

    // 5. Verificar si ya tiene servicio activo
    const servicioExistente = await prisma.transporteEstudiante.findFirst({
      where: {
        estudianteId,
        estado: { in: ["ACTIVO", "SUSPENDIDO"] },
      },
    });

    if (servicioExistente) {
      return NextResponse.json(
        { error: "El estudiante ya tiene un servicio de transporte activo o suspendido" },
        { status: 409 }
      );
    }

    // 6. ⚠️ CAMBIO IMPORTANTE: Usar fecha y hora ACTUAL
    const fechaActual = new Date();
    const docTrans = await obtenerSiguienteNumero("FA-TRAN");
    const horaActual = formatHoraLocal(fechaActual);
    const fechaActualStr = formatFechaLocal(fechaActual);

    console.log("📅 Generando factura de transporte con fecha:", fechaActualStr, horaActual);

    // 7. Obtener balance actual del tutor
    const ultimoMovimiento = await prisma.movimientoContable.findFirst({
      where: { tutorId: estudiante.tutorId },
      orderBy: { fecha: "desc" },
    });
    let balanceActual = ultimoMovimiento?.balance ? Number(ultimoMovimiento.balance) : 0;

    // 8. Crear movimiento contable de un solo débito (con fecha ACTUAL)
    balanceActual += valorAnual;
    await prisma.movimientoContable.create({
      data: {
        docNo: docTrans,
        fecha: fechaActual,
        hora: horaActual,
        tipo: TipoMovimiento.CARGO,
        descripcion: `FACTURACIÓN SERVICIO DE TRANSPORTE ESCOLAR DE [${estudiante.codigo} - ${estudiante.apellido}, ${estudiante.nombre}]`,
        debito: valorAnual,
        credito: 0,
        balance: balanceActual,
        tutorId: estudiante.tutorId,
        estudianteId: estudiante.id,
        realizadoPor: permiso.session?.user?.name || "SISTEMA",
      },
    });

    // 9. Verificar configuraciones de cuotas
    const configCuotas = tarifaActiva.configuracionesCuotas;

    if (!configCuotas || configCuotas.length === 0) {
      console.error("No hay configuraciones de cuotas para transporte");
      return NextResponse.json(
        { error: "No hay configuración de cuotas para transporte. El administrador debe configurar las fechas de vencimiento." },
        { status: 400 }
      );
    }

    // 10. Crear cargos individuales y cuentas por cobrar para cada cuota de transporte
    const cargosCreados = [];
    for (const config of configCuotas) {
      const fechaVencimiento = new Date(config.anio, config.mes - 1, config.diaVencimiento);

      let nombreTipo = "";
      switch (tipo) {
        case "COMPLETO":
          nombreTipo = "COMPLETO";
          break;
        case "MEDIO (RECOGER)":
          nombreTipo = "½ RECOGER";
          break;
        case "MEDIO (LLEVAR)":
          nombreTipo = "½ LLEVAR";
          break;
        default:
          nombreTipo = tipo;
      }

      const cargoNo = `TRANS. ${nombreTipo} ${config.numeroCuota}/${numCuotas}`;
      
      // Crear cargo individual para cada cuota
      const cargo = await prisma.cargo.create({
        data: {
          cargoNo,
          estudianteId: estudiante.id,
          tutorId: estudiante.tutorId,
          tipo: "TRANSPORTE",
          montoOriginal: valorCuota,
          recargo: 0,
          montoTotal: valorCuota,
          fechaVencimiento,
          montoPagado: 0,
          saldoPendiente: valorCuota,
          estado: EstadoCargo.PENDIENTE,
          anioEscolar: anioEscolarActual,
        },
      });
      cargosCreados.push(cargo);

      // Crear cuenta por cobrar para esta cuota
      await prisma.cuentaPorCobrar.create({
        data: {
          tutorId: estudiante.tutorId,
          cargoNo: cargoNo,
          tipo: "TRANSPORTE",
          valorCargo: valorCuota,
          recargo: 0,
          montoTotal: valorCuota,
          fechaEmision: fechaActual, // ⚠️ Usar fecha ACTUAL
          fechaVencimiento,
          montoPagado: 0,
          saldoPendiente: valorCuota,
          estado: EstadoCuenta.PENDIENTE,
          cargoId: cargo.id,
        },
      });
    }

    // 11. Crear registro en TransporteEstudiante
    const transporte = await prisma.transporteEstudiante.create({
      data: {
        cargoNo: docTrans,
        estudianteId: estudiante.id,
        tutorId: estudiante.tutorId,
        tipo,
        valorCuota,
        duracionMeses: numCuotas,
        montoTotal: valorAnual,
        fechaInicio: fechaInicioDate,
        estado: "ACTIVO",
        observaciones: observaciones || null,
        anioEscolar: anioEscolarActual,
      },
    });

    // 12. Asignar a la ruta si se seleccionó
    if (rutaId) {
      await prisma.estudianteRuta.create({
        data: {
          estudianteId: estudiante.id,
          rutaId,
          fechaInicio: fechaInicioDate,
          activo: true,
        },
      });
    }

    return NextResponse.json(
      {
        mensaje: `✅ Servicio de transporte ${tipo} activado exitosamente`,
        factura: docTrans,
        valorAnual,
        numeroCuotas: numCuotas,
        valorCuota,
        transporte,
        cargosGenerados: cargosCreados.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error POST /api/transporte/vincular:", error);
    return NextResponse.json({ error: "Error al vincular transporte" }, { status: 500 });
  }
}