import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const secciones = await prisma.seccion.findMany({
      orderBy: { creadoEn: "desc" },
      include: { curso: true },
    });
    return NextResponse.json({ secciones });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener secciones." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { codigo, nombre, cursoId, cupos } = await req.json();
    if (!codigo || !nombre || !cursoId) {
      return NextResponse.json({ error: "Código, nombre y curso son obligatorios." }, { status: 400 });
    }
    const existe = await prisma.seccion.findUnique({ where: { codigo } });
    if (existe) return NextResponse.json({ error: "Ya existe una sección con ese código." }, { status: 409 });

    const seccion = await prisma.seccion.create({
      data: { codigo, nombre, cursoId: parseInt(cursoId), cupos: cupos ? parseInt(cupos) : 30 },
    });
    return NextResponse.json({ mensaje: "Sección creada exitosamente.", seccion }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
