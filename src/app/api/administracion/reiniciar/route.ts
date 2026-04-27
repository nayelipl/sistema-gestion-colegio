import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any)?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tarifaActiva = await prisma.tarifaAnioEscolar.findFirst({
      where: { activo: true },
      include: { tarifasCurso: true },
    });

    if (!tarifaActiva) {
      return NextResponse.json({
        error: "No hay tarifas configuradas para el nuevo año escolar. Configure las tarifas primero."
      }, { status: 400 });
    }

    // Despublicar calificaciones del año actual
    await prisma.calificacion.updateMany({
      where: { publicado: true },
      data:  { publicado: false },
    });

    // Remover secciones de estudiantes para nuevo año escolar
    await prisma.estudiante.updateMany({
      data: { seccionId: null },
    });

    return NextResponse.json({
      mensaje: "Año escolar reiniciado exitosamente. Las calificaciones fueron archivadas y los estudiantes están listos para ser matriculados en el nuevo ciclo.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al reiniciar el año escolar." }, { status: 500 });
  }
}
