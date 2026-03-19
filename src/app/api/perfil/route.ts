import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { nombre, contrasenaActual, contrasenaNueva } = await req.json();

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });
    if (!usuario) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

    if (contrasenaNueva) {
      if (!contrasenaActual) {
        return NextResponse.json({ error: "Debes ingresar tu contraseña actual." }, { status: 400 });
      }
      const valida = await bcrypt.compare(contrasenaActual, usuario.contrasena);
      if (!valida) {
        return NextResponse.json({ error: "La contraseña actual es incorrecta." }, { status: 400 });
      }
    }

    const data: any = { nombre };
    if (contrasenaNueva) {
      data.contrasena = await bcrypt.hash(contrasenaNueva, 10);
    }

    await prisma.usuario.update({ where: { email: session.user.email }, data });
    return NextResponse.json({ mensaje: "Perfil actualizado exitosamente." });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
