import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from "bcryptjs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    
    const { anulado, motivo, contrasenaAutorizacion } = await req.json();
    
    const rol = (session.user as any)?.role;
    const usuarioId = (session.user as any).id;
    const usuarioNombre = (session.user as any).name || (session.user as any).email || "Usuario";

    // Validar que el rol tenga permisos para anular recibos
    if (rol === "CAJERO") {
      if (!contrasenaAutorizacion) {
        return NextResponse.json({ error: "Se requiere autorización del contador" }, { status: 403 });
      }

      // Buscar un contador activo
      const contador = await prisma.usuario.findFirst({
        where: { rol: "CONTADOR", activo: true }
      });

      if (!contador) {
        return NextResponse.json({ error: "No hay un contador activo en el sistema" }, { status: 403 });
      }

      const valida = await bcrypt.compare(contrasenaAutorizacion, contador.contrasena);
      if (!valida) {
        return NextResponse.json({ error: "Contraseña de autorización incorrecta" }, { status: 403 });
      }
    }

    // Si es CONTADOR o ADMINISTRADOR, continúa sin validación adicional
    const recibo = await prisma.reciboPago.findUnique({
      where: { id: parseInt(id) },
      include: {
        pagos: { include: { cargo: true } }
      }
    });

    if (!recibo) {
      return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 });
    }

    if (recibo.anulado) {
      return NextResponse.json({ error: "El recibo ya está anulado" }, { status: 400 });
    }

    const ahora = new Date();

    // Registrar el recibo como anulado en un movimiento contable inverso
    await prisma.$transaction(async (tx) => {
      // Marcar recibo como anulado
      await tx.reciboPago.update({
        where: { id: parseInt(id) },
        data: {
          anulado: true,
          anuladoPor: usuarioNombre,
          anuladoEn: ahora,
          motivoAnulacion: motivo || "Motivo no especificado"
        }
      });

      // Revertir los pagos de los cargos
      for (const pago of recibo.pagos) {
        const cargo = pago.cargo;
        const montoPagado = pago.montoPagado.toNumber();
        const saldoActual = cargo.saldoPendiente.toNumber();
        const montoPagadoActual = cargo.montoPagado?.toNumber() || 0;

        const nuevoSaldoPendiente = saldoActual + montoPagado;
        const nuevoMontoPagado = montoPagadoActual - montoPagado;

        let nuevoEstado = cargo.estado;
        if (nuevoSaldoPendiente <= 0) {
          nuevoEstado = "SALDO";
        } else if (nuevoSaldoPendiente < cargo.montoTotal.toNumber()) {
          nuevoEstado = "ABONADO";
        } else {
          nuevoEstado = "PENDIENTE";
        }

        await tx.cargo.update({
          where: { id: cargo.id },
          data: {
            montoPagado: nuevoMontoPagado,
            saldoPendiente: nuevoSaldoPendiente,
            estado: nuevoEstado
          }
        });
      }

      // Crear movimiento contable inverso, la anulación
      const ultimoMovimiento = await tx.movimientoContable.findFirst({
        where: { tutorId: recibo.tutorId },
        orderBy: { id: "desc" }
      });
      
      let nuevoBalance = ultimoMovimiento?.balance?.toNumber() || 0;
      nuevoBalance += recibo.total.toNumber();

      await tx.movimientoContable.create({
        data: {
          docNo: `AN-${recibo.reciboNo}`,
          fecha: ahora,
          hora: ahora.toLocaleTimeString("es-DO", { hour12: false }),
          tipo: "AJUSTE",
          descripcion: `ANULACIÓN DE RECIBO ${recibo.reciboNo} - ${motivo || "Sin motivo"}`,
          debito: recibo.total,
          credito: 0,
          balance: nuevoBalance,
          tutorId: recibo.tutorId,
          realizadoPor: usuarioNombre,
          relacionId: recibo.id,
        }
      });
    });

    return NextResponse.json({ success: true, mensaje: "Recibo anulado correctamente" });
  } catch (error) {
    console.error("Error anulando recibo:", error);
    return NextResponse.json({ error: "Error al anular el recibo" }, { status: 500 });
  }
}
