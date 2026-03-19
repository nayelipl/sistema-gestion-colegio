import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { seccionId } = await req.json();

    if (!seccionId) {
      return NextResponse.json({ error: "Debes seleccionar una sección." }, { status: 400 });
    }

    const estudiante = await prisma.estudiante.update({
      where: { id: parseInt(id) },
      data:  { seccionId: parseInt(seccionId) },
    });
    return NextResponse.json({ mensaje: "Sección asignada exitosamente.", estudiante });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al asignar sección." }, { status: 500 });
  }
}
