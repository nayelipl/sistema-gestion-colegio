import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

const ROLES_PUBLICAR = ["SECRETARIA_DOCENTE", "ADMINISTRADOR"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permiso = await verificarPermiso(ROLES_PUBLICAR);
  if (permiso.error)
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });

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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permiso = await verificarPermiso(ROLES_PUBLICAR);
  if (permiso.error)
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id } = await params;
    const body = await req.json();
    const calificacion = await prisma.calificacion.update({
      where: { id: parseInt(id) },
      data:  body,
    });
    return NextResponse.json({ mensaje: "Calificación actualizada.", calificacion });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }
}
