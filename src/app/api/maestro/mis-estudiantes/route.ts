import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    // Buscar el empleado (maestro) por email
    const empleado = await prisma.empleado.findUnique({
      where: { email: session.user.email },
    });
    
    if (!empleado) {
      return NextResponse.json({ 
        estudiantes: [], 
        secciones: [],
        asignaciones: [],
        mensaje: "Empleado no encontrado"
      });
    }

    // Obtener qué materias enseña en qué secciones y los estudiantes de esas secciones
    const asignaciones = await prisma.asignacionMaestro.findMany({
      where: { maestroId: empleado.id },
      include: {
        seccion: {
          include: {
            curso: true,
            estudiantes: {
              where: { activo: true },
              select: {
                id: true,
                nombre: true,
                apellido: true,
                codigo: true,
              }
            }
          }
        },
        asignatura: {
          select: { id: true, nombre: true, codigo: true }
        },
      },
    });

    // Formatear asignaciones para el frontend
    const asignacionesFormateadas = asignaciones.map(a => ({
      id: a.id,
      asignatura: {
        id: a.asignatura?.id || 0,
        nombre: a.asignatura?.nombre || "Sin asignatura",
        codigo: a.asignatura?.codigo || "",
      },
      seccion: {
        aula: a.seccion?.aula || "Sin aula",
        curso: {
          grado: a.seccion?.curso?.grado || "Sin grado",
        }
      }
    }));

    // Extraer estudiantes únicos
    const estudiantesMap = new Map();
    for (const a of asignaciones) {
      if (a.seccion?.estudiantes) {
        for (const estudiante of a.seccion.estudiantes) {
          if (!estudiantesMap.has(estudiante.id)) {
            estudiantesMap.set(estudiante.id, estudiante);
          }
        }
      }
    }

    return NextResponse.json({
      estudiantes: Array.from(estudiantesMap.values()),
      asignaciones: asignacionesFormateadas,
    });
  } catch (error) {
    console.error("Error GET /api/maestro/mis-estudiantes:", error);
    return NextResponse.json({
      estudiantes: [], 
      asignaciones: [],
      error: "Error al obtener estudiantes.",
    }, { status: 500 });
  }
}
