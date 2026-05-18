import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { obtenerSiguienteInscripcionNo, obtenerSiguienteNumero } from "@/lib/contador-secuencial";
import { TipoMovimiento, EstadoCuenta, EstadoCargo } from "@prisma/client";
import { formatFechaLocal } from "@/lib/formatear-fecha";

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

    // Si el estudiante está inactivo, lo reactivamos
    if (!estudiante.activo) {
      await prisma.estudiante.update({
        where: { id: estudianteId },
        data: { 
          activo: true,
          fechaBaja: null,
          motivoBaja: null
        }
      });
      
      // Reactivar usuario asociado (buscar por nombre)
      const usuarioEstudiante = await prisma.usuario.findFirst({
        where: {
          nombre: `${estudiante.nombre} ${estudiante.apellido}`,
          rol: "ESTUDIANTE",
        }
      });
      
      if (usuarioEstudiante?.email) {
        await prisma.usuario.update({
          where: { email: usuarioEstudiante.email },
          data: { activo: true },
        });
      }
    }

    if (!estudiante.tutorId) {
      return NextResponse.json({ error: "El estudiante no tiene un tutor asignado" }, { status: 400 });
    }

    // 2. Validar que el estudiante no tenga cargos pendientes del año escolar pasado
    const ultimaMatriculaTutor = await prisma.matricula.findFirst({
      where: { 
        estudiante: {
          tutorId: estudiante.tutorId
        }
      },
      orderBy: { creadoEn: "desc" },
      select: { anioEscolar: true }
    });

    const ultimoAnioEscolar = ultimaMatriculaTutor?.anioEscolar;

    // Si el tutor ya tiene matrículas y está intentando matricular en un año diferente
    if (ultimoAnioEscolar && ultimoAnioEscolar !== anioEscolar) {
      const ultimoMovimientoTutor = await prisma.movimientoContable.findFirst({
        where: { tutorId: estudiante.tutorId },
        orderBy: { id: "desc" },
      });

      const balanceActual = ultimoMovimientoTutor?.balance?.toNumber() || 0;

      if (balanceActual !== 0) {
        return NextResponse.json({ 
          error: `El tutor ${estudiante.tutor?.cuentaNo} - ${estudiante.tutor?.nombre} ${estudiante.tutor?.apellido} tiene un saldo pendiente de RD$${balanceActual.toFixed(2)} del año escolar ${ultimoAnioEscolar}. Debe regularizar su cuenta antes de matricular en el nuevo año escolar ${anioEscolar}.` 
        }, { status: 400 });
      }
    }

    // 3. Validar si ya está matriculado
    const matriculaExistente = await prisma.matricula.findFirst({
      where: { estudianteId, anioEscolar },
    });

    if (matriculaExistente) {
      return NextResponse.json({ error: "El estudiante ya está matriculado en este año escolar" }, { status: 400 });
    }

    // 4. Obtener tarifa activa
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

    // 5. Obtener sección y curso
    const seccion = await prisma.seccion.findUnique({
      where: { id: seccionId },
      include: { curso: true },
    });

    if (!seccion || !seccion.curso) {
      return NextResponse.json({ error: "Sección o curso no encontrado" }, { status: 404 });
    }

    if (!seccion.activo) {
      return NextResponse.json({ error: "No se puede matricular en una sección inactiva" }, { status: 400 });
    }

    // 6. Obtener tarifa del curso
    const tarifaCurso = tarifaActiva.tarifasCurso.find(tc => tc.cursoId === seccion.cursoId);

    if (!tarifaCurso) {
      return NextResponse.json({ 
        error: "No hay tarifa configurada para el curso seleccionado" 
      }, { status: 400 });
    }

    // 7. Generar números secuenciales
    const inscripcionNo = await obtenerSiguienteInscripcionNo();
    const docInsc = await obtenerSiguienteNumero("FA-INSC");
    const docRecibo = await obtenerSiguienteNumero("RI");
    const docColeFactura = await obtenerSiguienteNumero("FA-COLE");

    const horaActual = formatFechaLocal(new Date());
    const valorInscripcion = Number(tarifaActiva.valorInscripcion);
    const valorCuotaMensual = Number(tarifaCurso.cuotaColegiatura);
    const valorCobradoNum = Number(valorCobrado) || 0;
    
    // Calcular total de colegiatura (suma de todas las cuotas)
    const totalColegiatura = valorCuotaMensual * tarifaActiva.colegiaturaNumCuotas;

    // 8. Crear la matrícula
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

    // Obtener el último balance del tutor, de todos sus representados
    const ultimoMovimientoTutor = await prisma.movimientoContable.findFirst({
      where: { tutorId: estudiante.tutorId },
      orderBy: { id: "desc" },
    });
    let balance = ultimoMovimientoTutor?.balance?.toNumber() || 0;
    
    // 9. Cargo por matriculación
    // Vencimiento de la inscripcion es el 25 de septiembre del año escolar
    const anioInicio = parseInt(anioEscolar.split('-')[0]); // Si es "2025-2026" entonces sería 2025
    const fechaVencimientoInscripcion = new Date(anioInicio, 8, 25);
    fechaVencimientoInscripcion.setHours(0, 0, 0, 0);

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
        estado: valorCobradoNum >= valorInscripcion ? EstadoCargo.SALDO : EstadoCargo.ABONADO,
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

    // 10. Facturación consolidada de colegiatura
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

    // 11. Actualizar la sección del estudiante
    await prisma.estudiante.update({
      where: { id: estudianteId },
      data: { seccionId },
    });

    await prisma.seccion.update({
      where: { id: seccionId },
      data: { inscritos: { increment: 1 } },
    });

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
