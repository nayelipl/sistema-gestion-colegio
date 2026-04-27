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

    const pagos = await prisma.reciboPago.findMany({
      where,
      include: { tutor: { select: { nombre: true, apellido: true, cuentaNo: true } } },
      orderBy: { creadoEn: "desc" },
    });
    return NextResponse.json({ pagos });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener pagos." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tutorId, monto, metodoPago } = await req.json();
    if (!tutorId || !monto || !metodoPago) {
      return NextResponse.json({ error: "Todos los campos son obligatorios." }, { status: 400 });
    }

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
        tutorId:     parseInt(tutorId),
        subTotal:    montoNum,
        total:       montoNum,
        hora,
        metodoPago,
        realizadoPor: "SISTEMA",
      },
      include: { tutor: { select: { nombre: true, apellido: true, cuentaNo: true } } },
    });

    return NextResponse.json({ mensaje: "Pago registrado exitosamente.", pago }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
