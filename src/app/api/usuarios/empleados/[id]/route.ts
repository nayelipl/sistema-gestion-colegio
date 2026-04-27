import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id   = parseInt(rawId);
    const data = await req.json();
    const empleado = await prisma.empleado.update({
      where: { id },
      data: {
        nombre:   data.nombre,
        apellido: data.apellido,
        email:    data.email,
        telefono: data.telefono,
        salario:  data.salario ? parseFloat(data.salario) : null,
      },
    });
    if (data.rol) {
      await prisma.usuario.updateMany({
        where: { email: data.email },
        data:  { rol: data.rol },
      });
    }
    return NextResponse.json({ mensaje: "Empleado actualizado.", empleado });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id         = parseInt(rawId);
    const { activo } = await req.json();
    const empleado   = await prisma.empleado.update({
      where: { id },
      data:  { activo },
    });
    return NextResponse.json({ mensaje: `Empleado ${activo ? "habilitado" : "inhabilitado"}.`, empleado });
  } catch (error) {
    return NextResponse.json({ error: "Error al cambiar estado." }, { status: 500 });
  }
}
