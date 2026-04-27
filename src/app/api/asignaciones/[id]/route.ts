import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.asignacionMaestro.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ mensaje: "Asignación eliminada." });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar." }, { status: 500 });
  }
}
