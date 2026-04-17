import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest, { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const estudianteId = parseInt(id);
    if (isNaN(estudianteId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const { seccionId } = await req.json();
    if (!seccionId) {
      return NextResponse.json({ error: "Debes seleccionar una sección." }, { status: 400 });
    }

    // Verificar que la sección existe
    const seccion = await prisma.seccion.findUnique({
      where: { id: seccionId },
    });

    if (!seccion) {
      return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 });
    }

    const estudiante = await prisma.estudiante.update({
      where: { id: estudianteId },
      data: { 
        seccionId: seccionId,
      },
      include: {
        seccion: {
          include: { curso: true }
        }
      }
    });

    return NextResponse.json({ mensaje: "Sección asignada exitosamente.", estudiante });
  } catch (error) {
    console.error(error);
    console.error("Error PATCH /api/matricula/[id]:", error);
    return NextResponse.json({ error: "Error al asignar sección." }, { status: 500 });
  }
}
