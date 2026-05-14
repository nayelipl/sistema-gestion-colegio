import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rol = (session.user as any)?.role;
    if (!["ADMINISTRADOR", "CONTADOR", "CAJERO"].includes(rol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    const { estado } = body;

    const cuadre = await prisma.cajaChicaCuadre.update({
      where: { id },
      data: { estado }
    });

    return NextResponse.json({ mensaje: "Cuadre actualizado", cuadre });
  } catch (error) {
    console.error("Error PUT cuadre:", error);
    return NextResponse.json({ error: "Error al actualizar cuadre" }, { status: 500 });
  }
}
