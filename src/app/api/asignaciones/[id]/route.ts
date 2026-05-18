import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

const ROLES_ESCRITURA = ["ADMINISTRADOR", "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA"];

// DELETE: Soft delete (desactivar/eliminar asignación)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(ROLES_ESCRITURA);
  if (permiso.error) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }

  try {
    const { id } = await params;
    const asignacionId = parseInt(id);

    if (isNaN(asignacionId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar si la asignación existe
    const asignacion = await prisma.asignacionMaestro.findUnique({
      where: { id: asignacionId },
      include: {
        horarios: true
      }
    });

    if (!asignacion) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
    }

    // Verificar si tiene horarios asociados
    if (asignacion.horarios && asignacion.horarios.length > 0) {
      // Primero eliminar los horarios asociados
      await prisma.horario.deleteMany({
        where: { asignacionId: asignacionId }
      });
    }

    // Eliminar la asignación
    await prisma.asignacionMaestro.delete({
      where: { id: asignacionId }
    });

    return NextResponse.json({ 
      mensaje: "Asignación de maestro eliminada correctamente" 
    });

  } catch (error: any) {
    console.error("Error al eliminar asignación:", error);
    
    if (error.code === 'P2003') {
      return NextResponse.json({ 
        error: "No se puede eliminar la asignación porque tiene registros relacionados." 
      }, { status: 409 });
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      error: `Error al eliminar la asignación: ${error.message || "Error interno"}` 
    }, { status: 500 });
  }
}

// PUT: Actualizar asignación
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(ROLES_ESCRITURA);
  if (permiso.error) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }

  try {
    const { id } = await params;
    const { maestroId, asignaturaId, seccionId } = await req.json();

    const asignacionId = parseInt(id);
    
    if (isNaN(asignacionId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    if (!maestroId || !asignaturaId || !seccionId) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    }

    // Verificar que la asignación existe
    const existeAsignacion = await prisma.asignacionMaestro.findUnique({
      where: { id: asignacionId }
    });

    if (!existeAsignacion) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
    }

    // Verificar que no exista duplicado
    const duplicado = await prisma.asignacionMaestro.findFirst({
      where: {
        maestroId: parseInt(maestroId),
        seccionId: parseInt(seccionId),
        asignaturaId: parseInt(asignaturaId),
        NOT: { id: asignacionId }
      }
    });

    if (duplicado) {
      return NextResponse.json({ 
        error: "Ya existe una asignación para este maestro, sección y asignatura" 
      }, { status: 409 });
    }

    // Actualizar la asignación
    const asignacion = await prisma.asignacionMaestro.update({
      where: { id: asignacionId },
      data: {
        maestroId: parseInt(maestroId),
        asignaturaId: parseInt(asignaturaId),
        seccionId: parseInt(seccionId)
      },
      include: {
        maestro: true,
        asignatura: true,
        seccion: {
          include: {
            curso: true
          }
        }
      }
    });

    return NextResponse.json({ 
      mensaje: "Asignación actualizada correctamente",
      asignacion 
    });

  } catch (error: any) {
    console.error("Error al actualizar asignación:", error);
    return NextResponse.json({ 
      error: `Error al actualizar la asignación: ${error.message || "Error interno"}` 
    }, { status: 500 });
  }
}
