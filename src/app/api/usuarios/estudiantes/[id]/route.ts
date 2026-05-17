import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permiso = await verificarPermiso(["ADMINISTRADOR", "SECRETARIA_DOCENTE"]);
  if (permiso.error) return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id: rawId } = await params;
    const id   = parseInt(rawId);
    const data = await req.json();
    const estudiante = await prisma.estudiante.update({
      where: { id },
      data: {
        nombre:   data.nombre,
        apellido: data.apellido,
        RNE:      data.RNE      || null,
        fechaNac: data.fechaNac ? new Date(data.fechaNac) : null,
        tutorId:  parseInt(data.tutorId),
      },
    });
    return NextResponse.json({ mensaje: "Estudiante actualizado.", estudiante });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permiso = await verificarPermiso([
    "ADMINISTRADOR", "SECRETARIA_DOCENTE",
    "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA"
  ]);
  if (permiso.error) return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id } = await params;
    const estudianteId = parseInt(id);
    const data = await req.json();
    if (isNaN(estudianteId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    const updateData: any = {};
    if (data.seccionId !== undefined) updateData.seccionId = parseInt(data.seccionId);
    if (data.tutorId   !== undefined) updateData.tutorId   = parseInt(data.tutorId);
    if (data.nombre    !== undefined) updateData.nombre    = data.nombre;
    if (data.apellido  !== undefined) updateData.apellido  = data.apellido;
    const estudiante = await prisma.estudiante.update({
      where: { id: estudianteId },
      data:  updateData,
      include: { tutor: true, seccion: { include: { curso: true } } },
    });
    return NextResponse.json(estudiante);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar estudiante" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(["SECRETARIA_DOCENTE"]);
  if (permiso.error)
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    if (isNaN(id))
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const estudiante = await prisma.estudiante.findUnique({ where: { id } });
    if (!estudiante)
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });

    if (!estudiante.activo)
      return NextResponse.json({ error: "El estudiante ya está inactivo" }, { status: 400 });

    await prisma.$transaction([
      prisma.estudiante.update({
        where: { id },
        data: { activo: false },
      }),
      prisma.usuario.updateMany({
        where: {
          nombre: `${estudiante.nombre} ${estudiante.apellido}`,
          rol: "ESTUDIANTE",
          activo: true,
        },
        data: { activo: false },
      }),
    ]);

    return NextResponse.json({
      mensaje: `Estudiante ${estudiante.nombre} ${estudiante.apellido} dado de baja correctamente.`,
    });
  } catch (error) {
    console.error("Error DELETE /api/usuarios/estudiantes/[id]:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
