import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

const ROLES = ["ADMINISTRADOR", "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA"];

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(ROLES);
  if (permiso.error)
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id } = await params;
    await prisma.asignacionMaestro.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ mensaje: "Asignación eliminada." });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(ROLES);
  if (permiso.error)
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id } = await params;
    const { maestroId, seccionId, asignaturaId } = await req.json();

    const existe = await prisma.asignacionMaestro.findFirst({
      where: {
        maestroId:    parseInt(maestroId),
        seccionId:    parseInt(seccionId),
        asignaturaId: parseInt(asignaturaId),
        NOT: { id: parseInt(id) },
      },
    });
    if (existe)
      return NextResponse.json({ error: "Ya existe esa asignación." }, { status: 409 });

    const actualizada = await prisma.asignacionMaestro.update({
      where: { id: parseInt(id) },
      data: {
        maestroId:    parseInt(maestroId),
        seccionId:    parseInt(seccionId),
        asignaturaId: parseInt(asignaturaId),
      },
      include: {
        maestro:    true,
        seccion:    { include: { curso: true } },
        asignatura: true,
      },
    });
    return NextResponse.json({ mensaje: "Asignación actualizada.", asignacion: actualizada });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }
}
