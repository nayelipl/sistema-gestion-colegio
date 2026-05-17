import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

const ROLES_ESCRITURA = ["ADMINISTRADOR","DIRECCION_ACADEMICA","COORDINACION_ACADEMICA"];
const ROLES_ESTADO    = ["ADMINISTRADOR","DIRECCION_ACADEMICA"];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(ROLES_ESCRITURA);
  if (permiso.error) return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id } = await params;
    const { codigo, aula, cursoId, maestroEncargadoId, cupos } = await req.json();

    if (!codigo || !aula || !cursoId) {
      return NextResponse.json({ error: "Código, aula y curso son obligatorios." }, { status: 400 });
    }

    // Verificar código duplicado excluyendo el actual
    const existe = await prisma.seccion.findFirst({
      where: { codigo, NOT: { id: parseInt(id) } },
    });
    if (existe) return NextResponse.json({ error: "Ya existe otra sección con ese código." }, { status: 409 });

    const seccion = await prisma.seccion.update({
      where: { id: parseInt(id) },
      data: {
        codigo,
        aula,
        cursoId: parseInt(cursoId),
        maestroEncargadoId: maestroEncargadoId ? parseInt(maestroEncargadoId) : null,
        cupos: cupos ? parseInt(cupos) : 30,
      },
      include: { curso: true, maestroEncargado: true },
    });
    return NextResponse.json({ mensaje: "Sección actualizada.", seccion });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar sección." }, { status: 500 });
  }
}

// Solo DIRECCION_ACADEMICA cambia el estado activo/inactivo
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(ROLES_ESTADO);
  if (permiso.error) return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id } = await params;
    const { activo } = await req.json();

    if (typeof activo !== "boolean") {
      return NextResponse.json({ error: "El campo 'activo' debe ser true o false." }, { status: 400 });
    }

    const seccion = await prisma.seccion.update({
      where: { id: parseInt(id) },
      data: { activo },
      include: { curso: true },
    });
    return NextResponse.json({
      mensaje: `Sección ${activo ? "activada" : "desactivada"} correctamente.`,
      seccion,
    });
  } catch (error) {
    return NextResponse.json({ error: "Error al cambiar estado." }, { status: 500 });
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
    const seccionId = parseInt(id);

    // Verificar que no tenga estudiantes o matrículas activas
    const tieneEstudiantes = await prisma.estudiante.count({ where: { seccionId } });
    if (tieneEstudiantes > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: tiene ${tieneEstudiantes} estudiante(s) asignado(s).` },
        { status: 409 }
      );
    }

    const tieneMatriculas = await prisma.matricula.count({ where: { seccionId } });
    if (tieneMatriculas > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: tiene ${tieneMatriculas} matrícula(s) registrada(s).` },
        { status: 409 }
      );
    }

    await prisma.seccion.delete({ where: { id: seccionId } });
    return NextResponse.json({ mensaje: "Sección eliminada correctamente." });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar sección." }, { status: 500 });
  }
}
