import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const estudiantes = await prisma.estudiante.findMany({
      select: {
        id: true,
        nombre: true,
        apellido: true,
        codigo: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    return NextResponse.json(estudiantes);
  } catch (error) {
    console.error("Error GET /api/estudiante:", error);
    return NextResponse.json({ error: "Error al obtener estudiantes" }, { status: 500 });
  }
}
