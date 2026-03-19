import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const estudianteId = searchParams.get("estudianteId");

    const where: any = {};
    if (estudianteId) where.estudianteId = parseInt(estudianteId);

    const calificaciones = await prisma.calificacion.findMany({
      where,
      orderBy: { creadoEn: "desc" },
      include: {
        estudiante: { select: { nombre: true, apellido: true, codigo: true } },
        asignatura: { select: { nombre: true, codigo: true } },
      },
    });
    return NextResponse.json({ calificaciones });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener calificaciones." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { estudianteId, asignaturaId, periodo, nota } = await req.json();
    if (!estudianteId || !asignaturaId || !periodo || nota === undefined) {
      return NextResponse.json({ error: "Todos los campos son obligatorios." }, { status: 400 });
    }
    const calificacion = await prisma.calificacion.create({
      data: {
        estudianteId: parseInt(estudianteId),
        asignaturaId: parseInt(asignaturaId),
        periodo,
        nota: parseFloat(nota),
      },
    });
    return NextResponse.json({ mensaje: "Calificación registrada.", calificacion }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
