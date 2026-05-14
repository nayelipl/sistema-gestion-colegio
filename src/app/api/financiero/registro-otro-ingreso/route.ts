import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerSiguienteNumero } from "@/lib/contador-secuencial";
import { TipoMovimiento } from "@prisma/client";
import bcrypt from "bcryptjs";
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
    const { concepto, alPortador, estudianteId, monto, metodoPago, descripcion, fecha, contrasenaAutorizacion, origen } = body;

    // 🔍 LOG 1: Datos recibidos
    console.log("=== [registro-otro-ingreso] Datos recibidos ===");
    console.log("concepto:", concepto);
    console.log("monto:", monto);
    console.log("metodoPago:", metodoPago);
    console.log("origen recibido:", origen);
    console.log("rol del usuario:", rol);
    console.log("email:", session.user?.email);
    console.log("=============================================");
    
    if (!concepto || !alPortador || !monto || monto <= 0 || !metodoPago) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Validar para concepto DERECHO A GRADUACIÓN si el tutor tiene saldo pendiente
    if (concepto === "DERECHO A GRADUACIÓN" && estudianteId) {
        const estudiante = await prisma.estudiante.findUnique({
        where: { id: estudianteId },
        include: { tutor: true }
    });

    // Validar para EXCURSION ESCOLAR que se haya seleccionado un estudiante
    if (concepto === "EXCURSIÓN ESCOLAR") {
        if (!estudianteId) {
            return NextResponse.json({ error: "Debe seleccionar un estudiante" }, { status: 400 });
        }
    }

    if (!estudiante || !estudiante.tutorId) {
        return NextResponse.json({ error: "Estudiante no tiene tutor asignado" }, { status: 400 });
    }

    // Obtener el balance actual del tutor
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

    // Si no hay estudiante, usar tutor ficticio
    if (!tutorId) {
      let tutorVarios = await prisma.tutor.findFirst({
        where: { cuentaNo: "999999" }
      });
      
      if (!tutorVarios) {
        tutorVarios = await prisma.tutor.create({
          data: {
            cuentaNo: "999999",
            nombre: "VARIOS",
            apellido: "INGRESOS",
            tipoDocIdentidad: "CEDULA",
            numeroDocIdentidad: "00000000000",
            email: "varios@colegio.edu",
            ocupacion: "SISTEMA",
            nombreContactoAlterno: "SISTEMA",
          }
        });
      }
      tutorId = tutorVarios.id;
    }

    const resultado = await prisma.$transaction(async (tx) => {
      // Crear recibo sin cargo
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
          origen: "PRESENCIAL",
        },
      });

      // 🔍 LOG 2: Recibo creado
      console.log("=== [registro-otro-ingreso] Recibo creado ===");
      console.log("reciboNo:", recibo.reciboNo);
      console.log("id:", recibo.id);
      console.log("origen guardado:", (recibo as any).origen);
      console.log("concepto:", recibo.concepto);
      console.log("============================================");

      // Movimiento contable directo (ingreso)
      const ultimoMovimiento = await tx.movimientoContable.findFirst({
        where: { tutorId },
        orderBy: { id: "desc" },
      });

      let nuevoBalance = ultimoMovimiento?.balance?.toNumber() || 0;
      nuevoBalance += monto;

      const descripcionMovimiento = descripcion || `${concepto} - ${alPortador}`;

      await tx.movimientoContable.create({
        data: {
          docNo: reciboNo,
          fecha: fechaRecibo,
          hora,
          tipo: TipoMovimiento.PAGO,
          descripcion: descripcionMovimiento,
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
