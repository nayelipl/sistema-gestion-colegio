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

    const aniosEscolares = await prisma.tarifaAnioEscolar.findMany({
      where: { activo: true },
      select: { 
        id: true,
        anioEscolar: true,
        activo: true
      },
      orderBy: { anioEscolar: "desc" }
    });

    return NextResponse.json(aniosEscolares);
  } catch (error) {
    console.error("Error GET /api/academico/anios-escolares:", error);
    return NextResponse.json({ error: "Error al obtener años escolares" }, { status: 500 });
  }
}
