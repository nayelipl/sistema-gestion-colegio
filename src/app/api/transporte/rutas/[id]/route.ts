import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

// Actualizar ruta existente
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(["ADMINISTRADOR", "CONTADOR", "CAJERO"]);
  if (permiso.error) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }

  try {
    const { id } = await params;
    const idNum = parseInt(id);

    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const formData = await request.formData();
    const puntosRecorrido = JSON.parse(
      (formData.get("puntosRecorrido") as string) || "[]"
    );

    const ruta = await prisma.ruta.update({
      where: { id: idNum },
      data: {
        nombre: formData.get("nombre") as string,
        descripcion: (formData.get("descripcion") as string) || null,
        horarioRecogida: formData.get("horarioRecogida") as string,
        horarioRegreso: (formData.get("horarioRegreso") as string) || null,
        conductor: (formData.get("conductor") as string) || null,
        telefonoConductor: (formData.get("telefonoConductor") as string) || null,
        capacidad: parseInt(formData.get("capacidad") as string) || 20,
        puntosRecorrido,
      },
    });

    return NextResponse.json(ruta);
  } catch (error) {
    console.error("Error PUT /api/transporte/rutas/[id]:", error);
    return NextResponse.json(
      { error: "Error al actualizar la ruta" },
      { status: 500 }
    );
  }
}

// Eliminar ruta permanentemente
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(["ADMINISTRADOR"]);
  if (permiso.error) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }

  try {
    const { id } = await params;
    const idNum = parseInt(id);

    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar si la ruta existe
    const rutaExistente = await prisma.ruta.findUnique({
      where: { id: idNum },
      include: {
        asignaciones: {
          where: { activo: true }
        }
      } 
    });

    if (!rutaExistente) {
      return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 });
    }

    // Si tiene estudiantes activos, primero desactivar las asignaciones
    if (rutaExistente.asignaciones.length > 0) {
      await prisma.estudianteRuta.updateMany({
        where: {
          rutaId: idNum,
          activo: true,
        },
        data: {
          activo: false,
          fechaFin: new Date(),
        },
      });
    }

    // Eliminar todas las asignaciones (historial)
    await prisma.estudianteRuta.deleteMany({
      where: { rutaId: idNum },
    });

    // Eliminar la ruta permanentemente
    await prisma.ruta.delete({
      where: { id: idNum },
    });

    return NextResponse.json({
      mensaje: "Ruta eliminada permanentemente",
      success: true
    });
  } catch (error) {
    console.error("Error DELETE /api/transporte/rutas/[id]:", error);
    return NextResponse.json(
      { error: "Error al eliminar la ruta permanentemente" },
      { status: 500 }
    );
  }
}

// Activar/Desactivar ruta (sin eliminar)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(["ADMINISTRADOR", "CONTADOR", "CAJERO"]);
  if (permiso.error) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }

  try {
    const { id } = await params;
    const idNum = parseInt(id);

    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const { activo } = body;

    if (typeof activo !== 'boolean') {
      return NextResponse.json(
        { error: "El campo 'activo' es requerido y debe ser booleano" },
        { status: 400 }
      );
    }

    // Verificar si la ruta existe
    const rutaExistente = await prisma.ruta.findUnique({
      where: { id: idNum },
      include: {
        asignaciones: {
          where: { activo: true }
        }
      }
    });

    if (!rutaExistente) {
      return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 });
    }

    // Si se está desactivando la ruta, desactivar también las asignaciones activas
    if (!activo && rutaExistente.asignaciones.length > 0) {
      await prisma.estudianteRuta.updateMany({
        where: {
          rutaId: idNum,
          activo: true,
          fechaFin: null,
        },
        data: {
          activo: false,
          fechaFin: new Date(),
        },
      });
    }

    // Actualizar el estado de la ruta
    const ruta = await prisma.ruta.update({
      where: { id: idNum },
      data: { activo },
      include: {
        asignaciones: {
          where: { activo: true },
          include: {
            estudiante: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                apellido: true,
              }
            }
          }
        }
      }
    });

    const mensaje = activo 
      ? "Ruta activada correctamente" 
      : "Ruta desactivada correctamente. Los estudiantes han sido desasignados.";

    return NextResponse.json({
      mensaje,
      ruta,
      success: true
    });
  } catch (error) {
    console.error("Error PATCH /api/transporte/rutas/[id]:", error);
    return NextResponse.json(
      { error: "Error al cambiar el estado de la ruta" },
      { status: 500 }
    );
  }
}
