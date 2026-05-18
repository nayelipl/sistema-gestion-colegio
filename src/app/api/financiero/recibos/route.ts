import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ajustarFechasAPI } from "@/lib/ajustar-fechas";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rol = (session.user as any)?.role;
    if (!["ADMINISTRADOR", "CONTADOR", "CAJERO"].includes(rol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const tutorId = searchParams.get("tutorId");

    const { fechaDesde: fechaInicio, fechaHasta: fechaFin } = ajustarFechasAPI(
        fechaDesde || undefined,
        fechaHasta || undefined
    );

    const where: any = {};

    if (tutorId) {
      where.tutorId = parseInt(tutorId);
    }

    if (fechaInicio) {
      where.fecha = { gte: fechaInicio };
    }

    if (fechaFin) {
      where.fecha = { ...where.fecha, lte: fechaFin };
    }

    const recibos = await prisma.reciboPago.findMany({
      where,
      include: {
        tutor: {
          select: {
            nombre: true,
            apellido: true,
            cuentaNo: true,
          },
        },
        pagos: {
          include: {
            cargo: {
              select: {
                id: true,
                cargoNo: true,
                tipo: true,
                montoOriginal: true,
                recargo: true,
                montoTotal: true,
                estado: true,
              },
            },
          },
        },
      },
      orderBy: { fecha: "desc" }
    });

    const recibosFormateados = recibos.map((recibo) => ({
      id: recibo.id,
      reciboNo: recibo.reciboNo,
      fecha: recibo.fecha,
      hora: recibo.hora,
      metodoPago: recibo.metodoPago,
      subTotal: Number(recibo.subTotal) || 0,
      recargoTotal: Number(recibo.recargoTotal) || 0,
      total: Number(recibo.total) || 0,
      realizadoPor: recibo.realizadoPor,
      anulado: recibo.anulado,
      anuladoPor: recibo.anuladoPor,
      anuladoEn: recibo.anuladoEn,
      motivoAnulacion: recibo.motivoAnulacion,
      tutor: {
        nombre: recibo.tutor.nombre,
        apellido: recibo.tutor.apellido,
        cuentaNo: recibo.tutor.cuentaNo,
      },
      pagos: recibo.pagos.map((pago) => ({
        id: pago.id,
        montoPagado: Number(pago.montoPagado) || 0,
        cargo: {
          id: pago.cargo.id,
          cargoNo: pago.cargo.cargoNo,
          tipo: pago.cargo.tipo,
          montoOriginal: Number(pago.cargo.montoOriginal) || 0,
          recargo: Number(pago.cargo.recargo) || 0,
          montoTotal: Number(pago.cargo.montoTotal) || 0,
          estado: pago.cargo.estado,
        },
      })),
    }));

    return NextResponse.json({ recibos: recibosFormateados });
  } catch (error) {
    console.error("Error GET recibos:", error);
    return NextResponse.json({ error: "Error al obtener recibos" }, { status: 500 });
  }
}
