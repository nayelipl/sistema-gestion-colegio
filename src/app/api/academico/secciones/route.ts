import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const secciones = await prisma.seccion.findMany({
      orderBy: { codigo: "asc" },
      include: { curso: true, maestroEncargado: true },
    });
    return NextResponse.json({ secciones });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener secciones." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { codigo, aula, cursoId, maestroEncargadoId, cupos } = await req.json();
    
    if (!codigo || !aula || !cursoId) {
      return NextResponse.json({ error: "Código, aula y curso son obligatorios." }, { status: 400 });
    }

    const existe = await prisma.seccion.findUnique({ where: { codigo } });
    if (existe) return NextResponse.json({ error: "Ya existe una sección con ese código." }, { status: 409 });

    const seccion = await prisma.seccion.create({
      data: {
        codigo,
        aula,
        cursoId: parseInt(cursoId),
        maestroEncargadoId: maestroEncargadoId ? parseInt(maestroEncargadoId) : null,
        cupos: cupos === undefined || cupos === null || cupos === 0 ? 30 : parseInt(cupos),
        inscritos: 0,
        activo: true,
      },
    });
    return NextResponse.json({ mensaje: "Sección creada exitosamente.", seccion }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
