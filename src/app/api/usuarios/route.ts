import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [empleadosRaw, tutores, estudiantes] = await Promise.all([
      prisma.empleado.findMany({ orderBy: { creadoEn: "desc" } }),
      prisma.tutor.findMany({
        orderBy: { creadoEn: "desc" },
        include: { estudiantes: { select: { id: true, nombre: true, apellido: true } } },
      }),
      prisma.estudiante.findMany({
        orderBy: { creadoEn: "desc" },
        include: {
          tutor:   { select: { id: true, nombre: true, apellido: true, codigo: true } },
          seccion: { select: { id: true, nombre: true, codigo: true, curso: { select: { nombre: true } } } },
        },
      }),
    ]);

    // Traer el rol de cada empleado desde la tabla usuarios por email
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
