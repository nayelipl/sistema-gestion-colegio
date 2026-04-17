// src/app/api/transporte/vincular/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";
import { obtenerSiguienteNumero } from "@/lib/contador-secuencial";
import { TipoMovimiento, EstadoCuenta, EstadoCargo } from "@prisma/client";

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

    // 2. Verificar que el estudiante esté matriculado en el año escolar actual
    const anioEscolarActual = new Date().getFullYear() + "-" + (new Date().getFullYear() + 1);
    
    const matriculaActiva = await prisma.matricula.findFirst({
      where: {
        estudianteId,
        anioEscolar: anioEscolarActual,
      },
    });
    
    if (!matriculaActiva) {
      return NextResponse.json({ 
        error: "El estudiante no está matriculado en el año escolar actual. Debe matricularse primero." 
      }, { status: 400 });
    }

    // 3. Obtener tarifa activa
    const tarifaActiva = await prisma.tarifaAnioEscolar.findFirst({
      where: { anioEscolar: anioEscolarActual, activo: true },
      include: {
        tarifasTransporte: true,
        configuracionesCuotas: {
          where: { tipo: "TRANSPORTE" },
          orderBy: { numeroCuota: "asc" },
        },
      },
    });

    if (!tarifaActiva) {
      return NextResponse.json({ error: "No hay tarifa activa configurada para este año escolar" }, { status: 400 });
    }

    // 4. Buscar tarifa de transporte según tipo
    const tarifaTransporte = tarifaActiva.tarifasTransporte.find((t) => t.tipo === tipo);
    if (!tarifaTransporte) {
      return NextResponse.json({ error: `Tarifa no encontrada para tipo: ${tipo}` }, { status: 400 });
    }

    const numCuotas = tarifaActiva.transporteNumCuotas || 10;
    const valorAnual = Number(tarifaTransporte.valorAnual);
    const valorCuota = valorAnual / numCuotas;
    const fechaInicioDate = fechaInicio ? new Date(fechaInicio) : new Date();

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

    // 6. Generar documentos
    const docTrans = await obtenerSiguienteNumero("FA-TRAN");
    const horaActual = new Date().toLocaleTimeString("es-DO", { hour12: false });

    // 7. Obtener balance actual del tutor
    const ultimoMovimiento = await prisma.movimientoContable.findFirst({
      where: { tutorId: estudiante.tutorId },
      orderBy: { fecha: "desc" },
    });
    let balanceActual = ultimoMovimiento?.balance ? Number(ultimoMovimiento.balance) : 0;

    // 8. Crear movimiento contable de un solo débito
    balanceActual += valorAnual;
    await prisma.movimientoContable.create({
      data: {
        docNo: docTrans,
        fecha: new Date(),
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

    // 9. Crear cargo principal
    const cargoPrincipal = await prisma.cargo.create({
      data: {
        cargoNo: docTrans,
        estudianteId: estudiante.id,
        tutorId: estudiante.tutorId,
        tipo: "TRANSPORTE",
        montoOriginal: valorAnual,
        recargo: 0,
        montoTotal: valorAnual,
        fechaVencimiento: new Date(),
        saldoPendiente: valorAnual,
        estado: EstadoCargo.PENDIENTE,
        anioEscolar: anioEscolarActual,
      },
    });

    // 10. Crear cuentas por cobrar (una por cada cuota)
    const configCuotas = tarifaActiva.configuracionesCuotas;

    if (!configCuotas || configCuotas.length === 0) {
      return NextResponse.json(
        { error: "No hay configuración de cuotas para transporte" },
        { status: 400 }
      );
    }

    for (const config of configCuotas) {
      const fechaVencimiento = new Date(config.anio, config.mes - 1, config.diaVencimiento);
      const cargoNoCuota = `${docTrans}-CUOTA ${config.numeroCuota}/${numCuotas}`;

      await prisma.cuentaPorCobrar.create({
        data: {
          tutorId: estudiante.tutorId,
          cargoNo: cargoNoCuota,
          tipo: "TRANSPORTE",
          valorCargo: valorCuota,
          recargo: 0,
          montoTotal: valorCuota,
          fechaEmision: fechaInicioDate,
          fechaVencimiento,
          montoPagado: 0,
          saldoPendiente: valorCuota,
          estado: EstadoCuenta.PENDIENTE,
          cargoId: cargoPrincipal.id,
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error POST /api/transporte/vincular:", error);
    return NextResponse.json({ error: "Error al vincular transporte" }, { status: 500 });
  }
}
