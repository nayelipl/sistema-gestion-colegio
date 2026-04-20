import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const asignaturas = await prisma.asignatura.findMany({ 
      orderBy: { nombre: "asc" }
    });
    return NextResponse.json({ asignaturas });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener asignaturas." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { codigo, nombre } = await req.json();
    if (!codigo || !nombre) {
      return NextResponse.json({ error: "Código y nombre son obligatorios." }, { status: 400 });
    }
    const existe = await prisma.asignatura.findUnique({ where: { codigo } });
    if (existe) return NextResponse.json({ error: "Ya existe una asignatura con ese código." }, { status: 409 });

    const asignatura = await prisma.asignatura.create({ data: { codigo, nombre } });
    return NextResponse.json({ mensaje: "Asignatura creada exitosamente.", asignatura }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
