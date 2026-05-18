import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from "bcryptjs";
import { TipoMovimiento } from "@prisma/client";

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
    const usuarioNombre = (session.user as any).name || (session.user as any).email || "Usuario";

    const recibo = await prisma.reciboPago.findUnique({
      where: { id: parseInt(id) }
    });

    if (!recibo) {
      return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 });
    }

    if (recibo.anulado) {
      return NextResponse.json({ error: "El recibo ya está anulado" }, { status: 400 });
    }

    // Validar autorización para Cajero
    if (rol === "CAJERO") {
      if (!contrasenaAutorizacion) {
        return NextResponse.json({ error: "Se requiere autorización del contador" }, { status: 403 });
      }

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

    const ahora = new Date();

    await prisma.$transaction(async (tx) => {
      // Marcar recibo como anulado
      await tx.reciboPago.update({
        where: { id: parseInt(id) },
        data: {
          anulado: true,
          anuladoPor: usuarioNombre,
          anuladoEn: ahora,
          motivoAnulacion: motivo || "Sin motivo especificado"
        }
      });

      // Crear movimiento contable inverso
      const ultimoMovimiento = await tx.movimientoContable.findFirst({
        where: { tutorId: recibo.tutorId },
        orderBy: { id: "desc" }
      });
      
      let nuevoBalance = ultimoMovimiento?.balance?.toNumber() || 0;
      nuevoBalance -= recibo.total.toNumber();

      await tx.movimientoContable.create({
        data: {
          docNo: `AN-${recibo.reciboNo}`,
          fecha: ahora,
          hora: ahora.toLocaleTimeString("es-ES", { hour12: false }),
          tipo: TipoMovimiento.AJUSTE,
          descripcion: `ANULACIÓN DE RECIBO ${recibo.reciboNo} - ${motivo || "Sin motivo"}`,
          debito: 0,
          credito: 0,
          balance: nuevoBalance,
          tutorId: recibo.tutorId,
          realizadoPor: usuarioNombre,
          relacionId: recibo.id,
        }
      });
    });

    return NextResponse.json({ success: true, mensaje: "Ingreso anulado correctamente" });
  } catch (error) {
    console.error("Error anulando ingreso:", error);
    return NextResponse.json({ error: "Error al anular el ingreso" }, { status: 500 });
  }
}
