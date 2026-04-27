import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  const permiso = await verificarPermiso(["ADMINISTRADOR", "CONTADOR", "CAJERO"]);
  if (permiso.error) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }

  const searchParams = req.nextUrl.searchParams;
  const anioEscolar = searchParams.get("anioEscolar");
  const tipo = searchParams.get("tipo");

  const where: any = {};
  if (anioEscolar) where.anioEscolar = anioEscolar;
  if (tipo && tipo !== "TODOS") where.tipo = tipo;

  const servicios = await prisma.transporteEstudiante.findMany({
    where,
    include: {
      estudiante: {
        include: {
          tutor: true,
          matriculas: {
            where: { anioEscolar: anioEscolar || undefined },
            take: 1,
          },
        },
      },
    },
    orderBy: { fechaInicio: "desc" },
  });

  // Obtener años escolares disponibles
  const aniosEscolares = await prisma.transporteEstudiante.findMany({
    select: { anioEscolar: true },
    distinct: ["anioEscolar"],
    orderBy: { anioEscolar: "desc" },
  });

  return NextResponse.json({
    servicios,
    aniosEscolares: aniosEscolares.map(a => a.anioEscolar),
  });
}
