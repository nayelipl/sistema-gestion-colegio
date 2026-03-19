// src/app/api/usuarios/tutores/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const data = await req.json();

    const tutor = await prisma.tutor.update({
      where: { id },
      data: {
        nombre:    data.nombre,
        apellido:  data.apellido,
        email:     data.email,
        telefono:  data.telefono,
        direccion: data.direccion,
      },
    });

    return NextResponse.json({ mensaje: "Tutor actualizado.", tutor });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const { activo } = await req.json();

    const tutor = await prisma.tutor.update({
      where: { id },
      data: { activo },
    });

    return NextResponse.json({ mensaje: `Tutor ${activo ? "habilitado" : "inhabilitado"}.`, tutor });
  } catch (error) {
    return NextResponse.json({ error: "Error al cambiar estado." }, { status: 500 });
  }
}
