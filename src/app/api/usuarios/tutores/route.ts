import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function generarCodigo(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const { nombre, apellido, cedula, email, telefono, direccion, contrasena } = await req.json();

    if (!nombre || !apellido || !cedula || !email || !contrasena) {
      return NextResponse.json({ error: "Nombre, apellido, cédula, correo y contraseña son obligatorios." }, { status: 400 });
    }

    const existeTutor = await prisma.tutor.findFirst({ where: { OR: [{ cedula }, { email }] } });
    if (existeTutor) return NextResponse.json({ error: "Ya existe un tutor con esa cédula o correo." }, { status: 409 });

    const existeUsuario = await prisma.usuario.findUnique({ where: { email } });
    if (existeUsuario) return NextResponse.json({ error: "Ya existe una cuenta con ese correo." }, { status: 409 });

    let codigo = generarCodigo();
    while (await prisma.tutor.findUnique({ where: { codigo } })) {
      codigo = generarCodigo();
    }

    const hash = await bcrypt.hash(contrasena, 10);

    await prisma.$transaction([
      prisma.tutor.create({ data: { codigo, nombre, apellido, cedula, email, telefono, direccion } }),
      prisma.usuario.create({ data: { nombre: `${nombre} ${apellido}`, email, contrasena: hash, rol: "TUTOR" } }),
    ]);

    return NextResponse.json({ mensaje: `Tutor registrado. Código asignado: ${codigo}` }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
