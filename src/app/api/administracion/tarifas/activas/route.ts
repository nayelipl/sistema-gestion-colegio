import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// API pública para obtener tarifas activas (sin autenticación), para el usuario Cajero
export async function GET() {
  try {
    const tarifaActiva = await prisma.tarifaAnioEscolar.findFirst({
      where: { activo: true },
      include: {
        tarifasCurso: {
          include: { curso: true }
        },
        tarifasTransporte: true,
      },
      orderBy: { creadoEn: "desc" }
    });

    return NextResponse.json({ tarifaActiva });
  } catch (error) {
    console.error("Error GET /api/administracion/tarifas/activas:", error);
    return NextResponse.json({ error: "Error al obtener tarifas" }, { status: 500 });
  }
}
