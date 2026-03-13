// src/app/api/registro/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { nombre, email, contrasena, rol } = await req.json();

    // Validaciones básicas
    if (!nombre || !email || !contrasena) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios." },
        { status: 400 }
      );
    }

    if (contrasena.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese correo electrónico." },
        { status: 409 }
      );
    }

    // Encriptar contraseña
    const hash = await bcrypt.hash(contrasena, 12);

    // Crear usuario
    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        contrasena: hash,
        rol: rol ?? "VISITANTE",
      },
    });

    return NextResponse.json(
      { mensaje: "Usuario creado exitosamente.", id: usuario.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
