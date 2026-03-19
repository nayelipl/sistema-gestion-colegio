import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [empleados, tutores, estudiantes, secciones, asignaturas, pagos] = await Promise.all([
      prisma.empleado.count(),
      prisma.tutor.count(),
      prisma.estudiante.count(),
      prisma.seccion.count(),
      prisma.asignatura.count(),
      prisma.pago.count(),
    ]);
    return NextResponse.json({ empleados, tutores, estudiantes, secciones, asignaturas, pagos });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener estadísticas." }, { status: 500 });
  }
}
