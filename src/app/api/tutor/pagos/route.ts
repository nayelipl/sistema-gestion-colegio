import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const tutor = await prisma.tutor.findUnique({ where: { email: session.user.email } });
    if (!tutor) return NextResponse.json({ pagos: [] });

    const pagos = await prisma.reciboPago.findMany({
      where:   { tutorId: tutor.id },
      orderBy: { creadoEn: "desc" },
    });
    return NextResponse.json({ pagos });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener pagos." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const { monto, metodoPago } = await req.json();
    if (!monto || !metodoPago) {
      return NextResponse.json({ error: "Monto y método de pago son obligatorios." }, { status: 400 });
    }
    const tutor = await prisma.tutor.findUnique({ where: { email: session.user.email } });
    if (!tutor) return NextResponse.json({ error: "Tutor no encontrado." }, { status: 404 });

    const contador = await prisma.contador.upsert({
      where:  { id: "RP" },
      update: { ultimoNumero: { increment: 1 } },
      create: { id: "RP", ultimoNumero: 1 },
    });
    const reciboNo = `RP-${String(contador.ultimoNumero).padStart(5, "0")}`;
    const hora     = new Date().toLocaleTimeString("es-DO", { hour12: false });
    const montoNum = parseFloat(monto);

    const pago = await prisma.reciboPago.create({
      data: {
        reciboNo,
        tutorId:     tutor.id,
        subTotal:    montoNum,
        total:       montoNum,
        hora,
        metodoPago,
        realizadoPor: session.user.email,
      },
    });
    return NextResponse.json({ mensaje: "Pago realizado exitosamente.", pago }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
