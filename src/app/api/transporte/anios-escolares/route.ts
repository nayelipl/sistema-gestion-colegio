import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

export async function GET() {
  const permiso = await verificarPermiso(["ADMINISTRADOR", "CONTADOR", "CAJERO"]);
  if (permiso.error) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }

  const anios = await prisma.transporteEstudiante.findMany({
    select: { anioEscolar: true },
    distinct: ["anioEscolar"],
    orderBy: { anioEscolar: "desc" },
  });

  return NextResponse.json({ anios: anios.map(a => a.anioEscolar) });
}
