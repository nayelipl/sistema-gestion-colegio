import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tutorId = searchParams.get("tutorId");
    const fecha   = searchParams.get("fecha");

    const where: any = {};
    if (tutorId) where.tutorId = parseInt(tutorId);
    if (fecha) {
      const inicio = new Date(fecha);
      const fin    = new Date(fecha);
      fin.setDate(fin.getDate() + 1);
      where.creadoEn = { gte: inicio, lt: fin };
    }

    const pagos = await prisma.pago.findMany({
      where,
      include: { tutor: { select: { nombre: true, apellido: true, codigo: true } } },
      orderBy: { creadoEn: "desc" },
    });

    return NextResponse.json({ pagos });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener pagos." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tutorId, concepto, monto, montoPagado } = await req.json();

    if (!tutorId || !concepto || !monto || !montoPagado) {
      return NextResponse.json({ error: "Todos los campos son obligatorios." }, { status: 400 });
    }

    const montoNum      = parseFloat(monto);
    const montoPagadoNum = parseFloat(montoPagado);

    if (montoPagadoNum < montoNum) {
      return NextResponse.json({ error: "El monto pagado no puede ser menor al monto a cobrar." }, { status: 400 });
    }

    const cambio = montoPagadoNum - montoNum;

    const pago = await prisma.pago.create({
      data: {
        tutorId:    parseInt(tutorId),
        concepto,
        monto:      montoNum,
        montoPagado: montoPagadoNum,
        cambio,
        tipo:       "PRESENCIAL",
      },
      include: { tutor: { select: { nombre: true, apellido: true, codigo: true } } },
    });

    return NextResponse.json({
      mensaje: "Pago registrado exitosamente.",
      pago,
      cambio,
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
