import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const maestroId = searchParams.get("maestroId");

    const where: any = {};
    if (maestroId) where.maestroId = parseInt(maestroId);

    const asignaciones = await prisma.asignacionMaestro.findMany({
      where,
      include: {
        maestro:    { select: { nombre: true, apellido: true, email: true } },
        seccion:    { include: { curso: true } },
        asignatura: { select: { nombre: true, codigo: true } },
      },
      orderBy: { creadoEn: "desc" },
    });
    return NextResponse.json({ asignaciones });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener asignaciones." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { maestroId, seccionId, asignaturaId } = await req.json();
    if (!maestroId || !seccionId || !asignaturaId) {
      return NextResponse.json({ error: "Todos los campos son obligatorios." }, { status: 400 });
    }

    // Verificar que no existe ya esa asignación
    const existe = await prisma.asignacionMaestro.findFirst({
      where: {
        maestroId:    parseInt(maestroId),
        seccionId:    parseInt(seccionId),
        asignaturaId: parseInt(asignaturaId),
      },
    });
    if (existe) {
      return NextResponse.json({ error: "Esta asignación ya existe." }, { status: 409 });
    }

    const asignacion = await prisma.asignacionMaestro.create({
      data: {
        maestroId:    parseInt(maestroId),
        seccionId:    parseInt(seccionId),
        asignaturaId: parseInt(asignaturaId),
      },
      include: {
        maestro:    { select: { nombre: true, apellido: true } },
        seccion:    { include: { curso: true } },
        asignatura: { select: { nombre: true } },
      },
    });

    return NextResponse.json({ mensaje: "Asignación creada exitosamente.", asignacion }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
