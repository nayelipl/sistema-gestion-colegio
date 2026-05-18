import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const incluirInactivos = searchParams.get("incluirInactivos") === "true";

    const matriculaciones = await prisma.matricula.findMany({
      where: incluirInactivos 
        ? {} 
        : {
            estudiante: {
              activo: true
            }
          },
      include: {
        estudiante: {
          include: {
            tutor: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                cuentaNo: true,
              },
            },
          },
        },
        seccion: {
          include: {
            curso: true,
          },
        },
      },
      orderBy: { fecha: "desc" },
    });

    // Convertir los valores decimales a números
    const matriculacionesFormateadas = matriculaciones.map(mat => ({
      ...mat,
      valorCobrado: mat.valorCobrado ? Number(mat.valorCobrado) : 0
    }));

    return NextResponse.json({ matriculaciones: matriculacionesFormateadas });
  } catch (error) {
    console.error("Error GET /api/matricula/listado:", error);
    return NextResponse.json({ error: "Error al obtener matriculaciones" }, { status: 500 });
  }
}
