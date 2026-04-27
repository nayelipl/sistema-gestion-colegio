import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { publicado, publicadoPor } = await req.json();
    const calificacion = await prisma.calificacion.update({
      where: { id: parseInt(id) },
      data:  { publicado, publicadoPor: publicadoPor || null },
    });
    return NextResponse.json({ mensaje: "Calificación actualizada.", calificacion });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }
}
