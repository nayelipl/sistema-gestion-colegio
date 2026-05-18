// API para listar todas las tarifas
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tarifas = await prisma.tarifaAnioEscolar.findMany({
      include: {
        tarifasCurso: { include: { curso: true } },
        tarifasTransporte: true,
      },
      orderBy: { anioEscolar: "desc" }
    });

    return NextResponse.json({ tarifas });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener tarifas" }, { status: 500 });
  }
}
