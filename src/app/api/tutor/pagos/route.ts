import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const tutor = await prisma.tutor.findUnique({
      where: { email: session.user.email },
      include: { pagos: { orderBy: { creadoEn: "desc" } } },
    });
    if (!tutor) return NextResponse.json({ pagos: [] });
    return NextResponse.json({ pagos: tutor.pagos });
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
    const { concepto, monto } = await req.json();
    if (!concepto || !monto) {
      return NextResponse.json({ error: "Concepto y monto son obligatorios." }, { status: 400 });
    }
    const tutor = await prisma.tutor.findUnique({ where: { email: session.user.email } });
    if (!tutor) return NextResponse.json({ error: "Tutor no encontrado." }, { status: 404 });

    const pago = await prisma.pago.create({
      data: {
        tutorId:     tutor.id,
        concepto,
        monto:       parseFloat(monto),
        montoPagado: parseFloat(monto),
        cambio:      0,
        tipo:        "ONLINE",
      },
    });
    return NextResponse.json({ mensaje: "Pago realizado exitosamente.", pago }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
