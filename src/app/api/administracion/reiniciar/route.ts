import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Archivar calificaciones del año actual
    await prisma.calificacion.updateMany({
      where:  { estado: "PUBLICADA" },
      data:   { estado: "ARCHIVADA" },
    });

    // Remover secciones de estudiantes para nuevo ciclo
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
