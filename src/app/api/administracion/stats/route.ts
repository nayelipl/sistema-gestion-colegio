import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

const ROLES_VER = ["ADMINISTRADOR", "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA"];

export async function GET() {
  const permiso = await verificarPermiso(ROLES_VER);
  if (permiso.error)
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const [empleados, tutores, estudiantes, secciones, asignaturas, matriculas] = await Promise.all([
      prisma.empleado.count(),
      prisma.tutor.count(),
      prisma.estudiante.count(),
      prisma.seccion.count(),
      prisma.asignatura.count(),
      prisma.matricula.count(),
    ]);
    return NextResponse.json({ empleados, tutores, estudiantes, secciones, asignaturas, matriculas });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener estadísticas." }, { status: 500 });
  }
}
