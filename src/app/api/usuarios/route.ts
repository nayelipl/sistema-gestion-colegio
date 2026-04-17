import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const [empleadosRaw, tutores, estudiantes] = await Promise.all([
      prisma.empleado.findMany({
        select: { id: true, nombre: true, apellido: true, cedula: true, email: true, telefono: true, activo: true },
      }),
      prisma.tutor.findMany({
        orderBy: { creadoEn: "desc" },
        include: { estudiantes: { select: { id: true, nombre: true, apellido: true, fechaNac: true } } },
      }),
      prisma.estudiante.findMany({
        orderBy: { creadoEn: "desc" },
        include: {
          tutor:   { select: { id: true, nombre: true, apellido: true, cuentaNo: true } },
          seccion: { select: { id: true, aula: true, codigo: true, curso: { select: { grado: true } } } },
        },
      }),
    ]);

    const empleados = await Promise.all(
      empleadosRaw.map(async (emp) => {
        const usuario = await prisma.usuario.findUnique({
          where:  { email: emp.email },
          select: { rol: true },
        });
        return { ...emp, rol: usuario?.rol ?? null };
      })
    );

    return NextResponse.json({ empleados, tutores, estudiantes });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener usuarios." }, { status: 500 });
  }
}
