import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function generarCodigo(): string {
  return String(Math.floor(1000000000 + Math.random() * 9000000000));
}

export async function POST(req: NextRequest) {
  try {
    const { nombre, apellido, cedula, RNE, fechaNac, tutorId, email, contrasena } = await req.json();

    if (!nombre || !apellido || !email || !contrasena) {
      return NextResponse.json({ error: "Nombre, apellido, correo y contraseña son obligatorios." }, { status: 400 });
    }

    const existeUsuario = await prisma.usuario.findUnique({ where: { email } });
    if (existeUsuario) return NextResponse.json({ error: "Ya existe una cuenta con ese correo." }, { status: 409 });

    let codigo = generarCodigo();
    while (await prisma.estudiante.findUnique({ where: { codigo } })) {
      codigo = generarCodigo();
    }

    const hash = await bcrypt.hash(contrasena, 10);

    await prisma.$transaction([
      prisma.estudiante.create({
        data: {
          codigo, nombre, apellido,
          cedula:   cedula   || null,
          RNE:      RNE      || null,
          fechaNac: fechaNac ? new Date(fechaNac) : null,
          tutorId:  tutorId  ? parseInt(tutorId)  : null,
        },
      }),
      prisma.usuario.create({ data: { nombre: `${nombre} ${apellido}`, email, contrasena: hash, rol: "ESTUDIANTE" } }),
    ]);

    return NextResponse.json({ mensaje: `Estudiante registrado exitosamente. Código: ${codigo}` }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
