import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.asignacionMaestro.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ mensaje: "Asignación eliminada." });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar." }, { status: 500 });
  }
}
