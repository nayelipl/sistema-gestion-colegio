import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

const ROLES = ["ADMINISTRADOR","DIRECCION_ACADEMICA","COORDINACION_ACADEMICA"];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(ROLES);
  if (permiso.error) return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id } = await params;
    const { codigo, grado, nivel } = await req.json();
    if (!codigo || !grado || !nivel)
      return NextResponse.json({ error: "Código, grado y nivel son obligatorios." }, { status: 400 });

    const existe = await prisma.curso.findFirst({
      where: { codigo, NOT: { id: parseInt(id) } },
    });
    if (existe) return NextResponse.json({ error: "Ya existe otro curso con ese código." }, { status: 409 });

    const curso = await prisma.curso.update({
      where: { id: parseInt(id) },
      data: { codigo, grado, nivel },
      include: { secciones: true },
    });
    return NextResponse.json({ mensaje: "Curso actualizado.", curso });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar curso." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(ROLES);
  if (permiso.error) return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id } = await params;
    const cursoId = parseInt(id);

    const tieneSecciones = await prisma.seccion.count({ where: { cursoId } });
    if (tieneSecciones > 0)
      return NextResponse.json(
        { error: `No se puede eliminar: tiene ${tieneSecciones} sección(es) asociada(s).` },
        { status: 409 }
      );

    await prisma.curso.delete({ where: { id: cursoId } });
    return NextResponse.json({ mensaje: "Curso eliminado correctamente." });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar curso." }, { status: 500 });
  }
}
