// src/app/api/usuarios/estudiantes/[id]/route.ts
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
        tutorId:  data.tutorId  ? parseInt(data.tutorId)  : null,
      },
    });

    return NextResponse.json({ mensaje: "Estudiante actualizado.", estudiante });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const { activo } = await req.json();

    const estudiante = await prisma.estudiante.update({
      where: { id },
      data: { activo },
    });

    return NextResponse.json({ mensaje: `Estudiante ${activo ? "habilitado" : "inhabilitado"}.`, estudiante });
  } catch (error) {
    return NextResponse.json({ error: "Error al cambiar estado." }, { status: 500 });
  }
}
