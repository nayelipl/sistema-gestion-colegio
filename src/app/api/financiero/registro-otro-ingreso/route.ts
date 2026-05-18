import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerSiguienteNumero } from "@/lib/contador-secuencial";
import { TipoMovimiento } from "@prisma/client";
import { formatHoraLocal } from "@/lib/formatear-fecha";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rol = (session.user as any)?.role;
    const ROLES_PERMITIDOS = ["ADMINISTRADOR", "CONTADOR", "CAJERO", "TUTOR"];
    if (!ROLES_PERMITIDOS.includes(rol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    const body = await req.json();
    const { concepto, alPortador, estudianteId, monto, metodoPago, descripcion, fecha, origen } = body;

    console.log("=== [registro-otro-ingreso] Datos recibidos ===");
    console.log("concepto:", concepto);
    console.log("monto:", monto);
    console.log("metodoPago:", metodoPago);
    console.log("=============================================");
    
    if (!concepto || !alPortador || !monto || monto <= 0 || !metodoPago) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Validar para EXCURSION ESCOLAR que se haya seleccionado un estudiante
    if (concepto === "EXCURSIÓN ESCOLAR" && !estudianteId) {
      return NextResponse.json({ error: "Debe seleccionar un estudiante" }, { status: 400 });
    }

    // Validar para DERECHO A GRADUACIÓN que el tutor no tenga saldo pendiente
    if (concepto === "DERECHO A GRADUACIÓN" && estudianteId) {
      const estudiante = await prisma.estudiante.findUnique({
        where: { id: estudianteId },
        include: { tutor: true }
      });

      if (!estudiante || !estudiante.tutorId) {
        return NextResponse.json({ error: "Estudiante no tiene tutor asignado" }, { status: 400 });
      }

      const ultimoMovimiento = await prisma.movimientoContable.findFirst({
        where: { tutorId: estudiante.tutorId },
        orderBy: { id: "desc" },
      });

      const balanceActual = ultimoMovimiento?.balance?.toNumber() || 0;

      if (balanceActual !== 0) {
        return NextResponse.json({ 
          error: `El tutor ${estudiante.tutor?.cuentaNo} - ${estudiante.tutor?.nombre} ${estudiante.tutor?.apellido} tiene un saldo pendiente de RD$${balanceActual.toFixed(2)}. Debe regularizar su cuenta antes de pagar el derecho a graduación.` 
        }, { status: 400 });
      }
    }

    const reciboNo = await obtenerSiguienteNumero("RI");
    
    let fechaRecibo = new Date();
    if (fecha) {
      fechaRecibo = new Date(fecha);
    }
    const hora = formatHoraLocal(fechaRecibo);

    let tutorId = null;
    if (estudianteId) {
      const estudiante = await prisma.estudiante.findUnique({
        where: { id: estudianteId },
        select: { tutorId: true }
      });
      if (estudiante) {
        tutorId = estudiante.tutorId;
      }
    }

    // Si no hay estudiante, usar tutor genérico (solo buscar, no crear)
    if (!tutorId) {
      const tutorVarios = await prisma.tutor.findFirst({
        where: { cuentaNo: "999999" }
      });
      
      if (!tutorVarios) {
        return NextResponse.json({ 
          error: "Error de configuración: No se encuentra el tutor para ingresos varios. Contacte al administrador." 
        }, { status: 500 });
      }
      
      tutorId = tutorVarios.id;
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const recibo = await tx.reciboPago.create({
        data: {
          reciboNo,
          fecha: fechaRecibo,
          hora,
          tutorId,
          metodoPago,
          subTotal: monto,
          recargoTotal: 0,
          descuento: 0,
          total: monto,
          realizadoPor: session.user?.name || session.user?.email || "Sistema",
          concepto: concepto,
          alPortador: alPortador,
          descripcion: descripcion || `${concepto} - ${alPortador}`,
          origen: origen || "PRESENCIAL",
        },
      });

      console.log("=== [registro-otro-ingreso] Recibo creado ===");
      console.log("reciboNo:", recibo.reciboNo);
      console.log("============================================");

      const ultimoMovimiento = await tx.movimientoContable.findFirst({
        where: { tutorId },
        orderBy: { id: "desc" },
      });

      let nuevoBalance = ultimoMovimiento?.balance?.toNumber() || 0;
      nuevoBalance += monto;

      await tx.movimientoContable.create({
        data: {
          docNo: reciboNo,
          fecha: fechaRecibo,
          hora,
          tipo: TipoMovimiento.PAGO,
          descripcion: descripcion || `${concepto} - ${alPortador}`,
          debito: 0,
          credito: monto,
          balance: nuevoBalance,
          tutorId,
          estudianteId: estudianteId || null,
          realizadoPor: session.user?.name || session.user?.email || "Sistema",
          relacionId: recibo.id,
        },
      });

      return { reciboNo };
    });

    return NextResponse.json({
      success: true,
      mensaje: "Ingreso registrado exitosamente",
      reciboNo: resultado.reciboNo,
    });
  } catch (error) {
    console.error("Error registrando otro ingreso:", error);
    return NextResponse.json({ error: "Error al registrar el ingreso" }, { status: 500 });
  }
}
