import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";



export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const data = await req.json();

    const estudiante = await prisma.estudiante.update({
      where: { id },
      data: {
        nombre:   data.nombre,
        apellido: data.apellido,
        cedula:   data.cedula   || null,
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const estudianteId = parseInt(id);
    const data = await req.json();

    if (isNaN(estudianteId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Validar que tutorId sea válido si viene
    if (data.tutorId !== undefined && !data.tutorId) {
      return NextResponse.json({ error: "El tutor es requerido" }, { status: 400 });
    }

    const updateData: any = {};
    if (data.seccionId !== undefined) updateData.seccionId = parseInt(data.seccionId);
    if (data.tutorId !== undefined) updateData.tutorId = parseInt(data.tutorId);
    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.apellido !== undefined) updateData.apellido = data.apellido;
    
    const estudiante = await prisma.estudiante.update({
      where: { id: estudianteId },
      data: updateData,
      include: {
        tutor: true,
        seccion: { include: { curso: true } },
      },
    });

    return NextResponse.json(estudiante);
  } catch (error) {
    console.error("Error PATCH /api/usuarios/estudiantes/[id]:", error);
    return NextResponse.json({ error: "Error al actualizar estudiante" }, { status: 500 });
  }
}
