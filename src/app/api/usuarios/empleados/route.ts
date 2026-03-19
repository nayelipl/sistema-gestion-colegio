import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { nombre, apellido, cedula, email, telefono, salario, rol } = await req.json();

    if (!nombre || !apellido || !cedula || !email || !rol) {
      return NextResponse.json({ error: "Todos los campos obligatorios deben completarse." }, { status: 400 });
    }

    const existeEmpleado = await prisma.empleado.findFirst({
      where: { OR: [{ cedula }, { email }] },
    });
    if (existeEmpleado) return NextResponse.json({ error: "Ya existe un empleado con esa cédula o correo." }, { status: 409 });

    const existeUsuario = await prisma.usuario.findUnique({ where: { email } });
    if (existeUsuario) return NextResponse.json({ error: "Ya existe un usuario con ese correo." }, { status: 409 });

    const contrasenaTemp = `${apellido.slice(0, 4).toLowerCase()}${cedula.slice(-4)}`;
    const hash = await bcrypt.hash(contrasenaTemp, 10);

    const [empleado] = await prisma.$transaction([
      prisma.empleado.create({
        data: { nombre, apellido, cedula, email, telefono, salario: salario ? parseFloat(salario) : null },
      }),
      prisma.usuario.create({
        data: { nombre: `${nombre} ${apellido}`, email, contrasena: hash, rol: rol as any },
      }),
    ]);

    return NextResponse.json({
      mensaje: `Empleado registrado exitosamente.`,
      contrasenaTemp,
      empleado,
    }, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
