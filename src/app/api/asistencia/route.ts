import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get("fecha");

    const where: any = {};
    if (fecha) {
      const inicio = new Date(fecha);
      const fin    = new Date(fecha);
      fin.setDate(fin.getDate() + 1);
      where.fecha = { gte: inicio, lt: fin };
    }

    const asistencias = await prisma.asistencia.findMany({
      where,
      orderBy: { creadoEn: "desc" },
      include: {
        estudiante: { select: { nombre: true, apellido: true, codigo: true } },
      },
    });
    return NextResponse.json({ asistencias });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener asistencias." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { registros, fecha } = await req.json();
    if (!registros || !fecha) {
      return NextResponse.json({ error: "Registros y fecha son obligatorios." }, { status: 400 });
    }

    const fechaDate = new Date(fecha);

    // Eliminar registros existentes para esa fecha
    const inicio = new Date(fecha);
    const fin    = new Date(fecha);
    fin.setDate(fin.getDate() + 1);
    await prisma.asistencia.deleteMany({
      where: { fecha: { gte: inicio, lt: fin } },
    });

    // Crear nuevos registros
    await prisma.asistencia.createMany({
      data: registros.map((r: any) => ({
        estudianteId: r.estudianteId,
        fecha:        fechaDate,
        estado:       r.estado,
      })),
    });

    return NextResponse.json({ mensaje: "Asistencia registrada exitosamente." }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
