import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const matriculaciones = await prisma.matricula.findMany({
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
    return NextResponse.json({ matriculaciones });
  } catch (error) {
    console.error("Error GET /api/matricula/listado:", error);
    return NextResponse.json({ error: "Error al obtener matriculaciones" }, { status: 500 });
  }
}
