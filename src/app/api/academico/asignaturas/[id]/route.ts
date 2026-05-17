import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

const ROLES_ESCRITURA = ["ADMINISTRADOR","DIRECCION_ACADEMICA","COORDINACION_ACADEMICA"];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(ROLES_ESCRITURA);
  if (permiso.error) return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id } = await params;
    const { codigo, nombre } = await req.json();

    if (!codigo || !nombre) {
      return NextResponse.json({ error: "Código y nombre son obligatorios." }, { status: 400 });
    }

    const existe = await prisma.asignatura.findFirst({
      where: { codigo, NOT: { id: parseInt(id) } },
    });
    if (existe) return NextResponse.json({ error: "Ya existe otra asignatura con ese código." }, { status: 409 });

    const asignatura = await prisma.asignatura.update({
      where: { id: parseInt(id) },
      data: { codigo, nombre },
    });
    return NextResponse.json({ mensaje: "Asignatura actualizada.", asignatura });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar asignatura." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(ROLES_ESCRITURA);
  if (permiso.error) return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id } = await params;
    const asignaturaId = parseInt(id);

    // Verificar que no tenga calificaciones o asignaciones
    const tieneCalificaciones = await prisma.calificacion.count({ where: { asignaturaId } });
    if (tieneCalificaciones > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: tiene ${tieneCalificaciones} calificación(es) registrada(s).` },
        { status: 409 }
      );
    }

    const tieneAsignaciones = await prisma.asignacionMaestro.count({ where: { asignaturaId } });
    if (tieneAsignaciones > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: está asignada a ${tieneAsignaciones} maestro(s).` },
        { status: 409 }
      );
    }

    await prisma.asignatura.delete({ where: { id: asignaturaId } });
    return NextResponse.json({ mensaje: "Asignatura eliminada correctamente." });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar asignatura." }, { status: 500 });
  }
}
