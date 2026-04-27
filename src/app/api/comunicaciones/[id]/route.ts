import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { activo } = await req.json();
    const publicacion = await prisma.publicacion.update({
      where: { id: parseInt(id) },
      data:  { activo },
    });
    return NextResponse.json({ mensaje: "Publicación actualizada.", publicacion });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.publicacion.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ mensaje: "Publicación eliminada." });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar." }, { status: 500 });
  }
}
