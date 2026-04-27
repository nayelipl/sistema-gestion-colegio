import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { actual, nueva } = await req.json();
    if (!actual || !nueva) {
      return NextResponse.json({ error: "Contraseña actual y nueva son obligatorias." }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email: session.user.email } });
    if (!usuario) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

    const valida = await bcrypt.compare(actual, usuario.contrasena);
    if (!valida) return NextResponse.json({ error: "La contraseña actual es incorrecta." }, { status: 400 });

    const hash = await bcrypt.hash(nueva, 10);
    await prisma.usuario.update({ where: { email: session.user.email }, data: { contrasena: hash } });

    return NextResponse.json({ mensaje: "Contraseña actualizada correctamente." });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
