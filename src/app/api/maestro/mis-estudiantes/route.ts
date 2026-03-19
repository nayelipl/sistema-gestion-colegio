import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    // Buscar el empleado por email
    const empleado = await prisma.empleado.findUnique({
      where: { email: session.user.email },
    });
    if (!empleado) return NextResponse.json({ estudiantes: [], asignaciones: [] });

    // Obtener sus asignaciones
    const asignaciones = await prisma.asignacionMaestro.findMany({
      where: { maestroId: empleado.id },
      include: {
        seccion:    { include: { curso: true, estudiantes: true } },
        asignatura: { select: { id: true, nombre: true, codigo: true } },
      },
    });

    // Obtener estudiantes únicos de sus secciones
    const estudiantesMap = new Map();
    asignaciones.forEach(a => {
      a.seccion.estudiantes.forEach(e => {
        estudiantesMap.set(e.id, e);
      });
    });

    return NextResponse.json({
      estudiantes: Array.from(estudiantesMap.values()),
      asignaciones,
      empleadoId: empleado.id,
    });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener estudiantes." }, { status: 500 });
  }
}
