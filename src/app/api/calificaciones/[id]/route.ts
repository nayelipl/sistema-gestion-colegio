import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { estado } = await req.json();
    const calificacion = await prisma.calificacion.update({
      where: { id: parseInt(params.id) },
      data:  { estado },
    });
    return NextResponse.json({ mensaje: "Calificación actualizada.", calificacion });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }
}
