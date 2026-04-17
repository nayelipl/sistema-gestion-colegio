import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { obtenerSiguienteInscripcionNo, obtenerSiguienteNumero } from "@/lib/contador-secuencial";
import { TipoMovimiento, EstadoCuenta, EstadoCargo } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { estudianteId, seccionId, anioEscolar, valorCobrado, observaciones } = await req.json();

    if (!estudianteId || !seccionId) {
      return NextResponse.json({ error: "Estudiante y sección son requeridos" }, { status: 400 });
    }

    // 1. Obtener estudiante y su tutor
    const estudiante = await prisma.estudiante.findUnique({
      where: { id: estudianteId },
      include: { tutor: true },
    });

    if (!estudiante) {
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
    }

    if (!estudiante.tutorId) {
      return NextResponse.json({ error: "El estudiante no tiene un tutor asignado" }, { status: 400 });
    }

    // 2. Validar si ya está matriculado
    const matriculaExistente = await prisma.matricula.findFirst({
      where: { estudianteId, anioEscolar },
    });

    if (matriculaExistente) {
      return NextResponse.json({ error: "El estudiante ya está matriculado en este año escolar" }, { status: 400 });
    }

    // 3. Obtener tarifa activa
    const tarifaActiva = await prisma.tarifaAnioEscolar.findFirst({
      where: { anioEscolar, activo: true },
      include: {
        tarifasCurso: true,
        configuracionesCuotas: {
          where: { tipo: "COLEGIATURA" },
          orderBy: { numeroCuota: "asc" },
        },
      },
    });

    if (!tarifaActiva) {
      return NextResponse.json({ error: "No hay tarifa configurada para este año escolar" }, { status: 400 });
    }

    if (tarifaActiva.configuracionesCuotas.length === 0) {
      return NextResponse.json({ 
        error: "No hay configuración de cuotas para esta tarifa" 
      }, { status: 400 });
    }

    // 4. Obtener sección y curso
    const seccion = await prisma.seccion.findUnique({
      where: { id: seccionId },
      include: { curso: true },
    });

    if (!seccion || !seccion.curso) {
      return NextResponse.json({ error: "Sección o curso no encontrado" }, { status: 404 });
    }

    // 5. Obtener tarifa del curso
    const tarifaCurso = tarifaActiva.tarifasCurso.find(tc => tc.cursoId === seccion.cursoId);

    if (!tarifaCurso) {
      return NextResponse.json({ 
        error: "No hay tarifa configurada para el curso seleccionado" 
      }, { status: 400 });
    }

    // 6. Generar números secuenciales
    const inscripcionNo = await obtenerSiguienteInscripcionNo();
    const docInsc = await obtenerSiguienteNumero("FA-INSC");
    const docRecibo = await obtenerSiguienteNumero("RI");
    const docColeFactura = await obtenerSiguienteNumero("FA-COLE");

    const horaActual = new Date().toLocaleTimeString("es-DO", { hour12: false });
    const valorInscripcion = Number(tarifaActiva.valorInscripcion);
    const valorCuotaMensual = Number(tarifaCurso.cuotaColegiatura);
    const valorCobradoNum = Number(valorCobrado) || 0;
    
    // Calcular total de colegiatura (suma de todas las cuotas)
    const totalColegiatura = valorCuotaMensual * tarifaActiva.colegiaturaNumCuotas;

    // 7. Crear la matrícula
    const matricula = await prisma.matricula.create({
      data: {
        inscripcionNo,
        fecha: new Date(),
        estudianteId,
        seccionId,
        anioEscolar,
        valorCobrado: valorCobradoNum,
        observaciones,
      },
    });

    let balance = 0;

    // 8. Cargo por matriculación
    const fechaVencimientoInscripcion = new Date();
    fechaVencimientoInscripcion.setDate(fechaVencimientoInscripcion.getDate() + 30);

    const cargoInscripcion = await prisma.cargo.create({
      data: {
        cargoNo: `INSCRIPCIÓN ${anioEscolar}`,
        estudianteId: estudiante.id,
        tutorId: estudiante.tutorId,
        tipo: "INSCRIPCION",
        montoOriginal: valorInscripcion,
        recargo: 0,
        montoTotal: valorInscripcion,
        fechaVencimiento: fechaVencimientoInscripcion,
        montoPagado: Math.min(valorCobradoNum, valorInscripcion),
        saldoPendiente: Math.max(0, valorInscripcion - valorCobradoNum),
        estado: valorCobradoNum >= valorInscripcion ? EstadoCargo.SALDA : EstadoCargo.ABONADA,
        anioEscolar,
      },
    });

    // Movimiento contable de cargo por inscripción
    balance += valorInscripcion;
    await prisma.movimientoContable.create({
      data: {
        docNo: docInsc,
        fecha: new Date(),
        hora: horaActual,
        tipo: TipoMovimiento.CARGO,
        descripcion: `CARGO POR INSCRIPCIÓN DE [${estudiante.codigo} - ${estudiante.apellido}, ${estudiante.nombre}]`,
        debito: valorInscripcion,
        credito: 0,
        balance: balance,
        tutorId: estudiante.tutorId,
        estudianteId: estudiante.id,
        realizadoPor: session.user?.name || "SISTEMA",
        relacionId: matricula.id,
      },
    });

    // Cuenta por cobrar para inscripción
    await prisma.cuentaPorCobrar.create({
      data: {
        tutorId: estudiante.tutorId,
        cargoNo: `INSCRIPCIÓN ${anioEscolar}`,
        tipo: "INSCRIPCION",
        valorCargo: valorInscripcion,
        recargo: 0,
        montoTotal: valorInscripcion,
        fechaEmision: new Date(),
        fechaVencimiento: fechaVencimientoInscripcion,
        montoPagado: Math.min(valorCobradoNum, valorInscripcion),
        saldoPendiente: Math.max(0, valorInscripcion - valorCobradoNum),
        estado: valorCobradoNum >= valorInscripcion ? EstadoCuenta.SALDA : EstadoCuenta.ABONADA,
        cargoId: cargoInscripcion.id,
      },
    });

    // Pago de inscripción (si aplica)
    if (valorCobradoNum > 0) {
      balance -= Math.min(valorCobradoNum, valorInscripcion);
      
      const recibo = await prisma.reciboPago.create({
        data: {
          reciboNo: docRecibo,
          fecha: new Date(),
          hora: horaActual,
          tutorId: estudiante.tutorId,
          metodoPago: "EFECTIVO",
          subTotal: Math.min(valorCobradoNum, valorInscripcion),
          recargoTotal: 0,
          descuento: 0,
          total: Math.min(valorCobradoNum, valorInscripcion),
          realizadoPor: session.user?.name || "SISTEMA",
        },
      });

      await prisma.movimientoContable.create({
        data: {
          docNo: docRecibo,
          fecha: new Date(),
          hora: horaActual,
          tipo: TipoMovimiento.PAGO,
          descripcion: `ABONO A INSCRIPCIÓN DE [${estudiante.codigo} - ${estudiante.apellido}, ${estudiante.nombre}]`,
          debito: 0,
          credito: Math.min(valorCobradoNum, valorInscripcion),
          balance: balance,
          tutorId: estudiante.tutorId,
          estudianteId: estudiante.id,
          realizadoPor: session.user?.name || "SISTEMA",
          relacionId: recibo.id,
        },
      });

      await prisma.pagoCargo.create({
        data: {
          reciboId: recibo.id,
          cargoId: cargoInscripcion.id,
          montoPagado: Math.min(valorCobradoNum, valorInscripcion),
        },
      });
    }

    // 9. Facturación consolidada de colegiatura
    // Crear los cargos individuales para cada cuota
    const cargosCreados = [];
    
    for (const config of tarifaActiva.configuracionesCuotas) {
      const fechaVencimiento = new Date(config.anio, config.mes - 1, config.diaVencimiento);
      const cargoNo = `CUOTA ${config.numeroCuota}/${tarifaActiva.colegiaturaNumCuotas}`;
      
      // Crear cargo individual para cada cuota
      const cargo = await prisma.cargo.create({
        data: {
          cargoNo,
          estudianteId: estudiante.id,
          tutorId: estudiante.tutorId,
          tipo: "COLEGIATURA",
          montoOriginal: valorCuotaMensual,
          recargo: 0,
          montoTotal: valorCuotaMensual,
          fechaVencimiento,
          montoPagado: 0,
          saldoPendiente: valorCuotaMensual,
          estado: EstadoCargo.PENDIENTE,
          anioEscolar,
        },
      });
      cargosCreados.push(cargo);

      // Cuenta por cobrar para cada cuota
      await prisma.cuentaPorCobrar.create({
        data: {
          tutorId: estudiante.tutorId,
          cargoNo,
          tipo: "COLEGIATURA",
          valorCargo: valorCuotaMensual,
          recargo: 0,
          montoTotal: valorCuotaMensual,
          fechaEmision: new Date(),
          fechaVencimiento,
          montoPagado: 0,
          saldoPendiente: valorCuotaMensual,
          estado: EstadoCuenta.PENDIENTE,
          cargoId: cargo.id,
        },
      });
    }

    // Un solo movimiento contable por total de colegiatura
    balance += totalColegiatura;
    await prisma.movimientoContable.create({
      data: {
        docNo: docColeFactura,
        fecha: new Date(),
        hora: horaActual,
        tipo: TipoMovimiento.CARGO,
        descripcion: `FACTURACIÓN CUOTAS COLEGIATURA DE [${estudiante.codigo} - ${estudiante.apellido}, ${estudiante.nombre}]`,
        debito: totalColegiatura,
        credito: 0,
        balance: balance,
        tutorId: estudiante.tutorId,
        estudianteId: estudiante.id,
        realizadoPor: session.user?.name || "SISTEMA",
        relacionId: matricula.id,
      },
    });

    // 10. Actualizar la sección del estudiante
    await prisma.estudiante.update({
      where: { id: estudianteId },
      data: { seccionId },
    });

    await prisma.seccion.update({
      where: { id: seccionId },
      data: { inscritos: { increment: 1 } },
    });

    console.log("✅ Matrícula completada exitosamente");
    console.log(`   Total colegiatura facturada: RD$${totalColegiatura}`);
    console.log(`   Cuotas generadas: ${cargosCreados.length}`);
    console.log(`   Transporte: Debe registrarse por separado en el módulo de transporte`);

    return NextResponse.json({
      mensaje: "Matriculación completada exitosamente",
      data: {
        matricula,
        inscripcionNo,
        anioEscolar,
        estudiante: {
          id: estudiante.id,
          codigo: estudiante.codigo,
          nombre: `${estudiante.nombre} ${estudiante.apellido}`,
        },
        totalPagado: Math.min(valorCobradoNum, valorInscripcion),
        saldoPendienteInscripcion: Math.max(0, valorInscripcion - valorCobradoNum),
        totalColegiatura,
        cargosGenerados: cargosCreados.length,
        documentos: {
          facturaInscripcion: docInsc,
          recibo: docRecibo,
          facturaColegiatura: docColeFactura,
        },
      },
    }, { status: 201 });
    
  } catch (error) {
    console.error("Error POST /api/matricula:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
