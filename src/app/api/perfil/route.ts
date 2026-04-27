import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const rol   = (session.user as any).role;
    const email = session.user.email;
    let perfil: any = null;

    if (rol === "TUTOR") {
      perfil = await prisma.tutor.findUnique({
        where:  { email },
        select: { nombre: true, apellido: true, celular: true, direccion: true,
          numeroDocIdentidad: true, cuentaNo: true, creadoEn: true },
      });
    } else if (rol === "ESTUDIANTE") {
      perfil = await prisma.estudiante.findFirst({
        where:  { codigo: email },
        select: { nombre: true, apellido: true, codigo: true, fechaNac: true, creadoEn: true,
          seccion: { select: { aula: true, curso: { select: { grado: true } } } } },
      });
    } else {
      perfil = await prisma.empleado.findUnique({
        where:  { email },
        select: { nombre: true, apellido: true, telefono: true, cedula: true, salario: true, creadoEn: true },
      });
    }

    return NextResponse.json({ perfil });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener perfil." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const rol   = (session.user as any).role;
    const email = session.user.email;
    const { nombre, apellido, telefono, direccion } = await req.json();

    if (rol === "TUTOR") {
      await prisma.tutor.update({
        where: { email },
        data:  { nombre, apellido, celular: telefono, direccion },
      });
    } else if (rol === "ESTUDIANTE") {
      await prisma.estudiante.updateMany({
        where: { codigo: email },
        data:  { nombre, apellido },
      });
    } else {
      await prisma.empleado.update({
        where: { email },
        data:  { nombre, apellido, telefono },
      });
    }

    await prisma.usuario.update({
      where: { email },
      data:  { nombre: `${nombre} ${apellido}` },
    });

    return NextResponse.json({ mensaje: "Perfil actualizado exitosamente." });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
