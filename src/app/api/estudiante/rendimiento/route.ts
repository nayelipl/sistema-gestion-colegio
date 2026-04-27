import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const estudiante = await prisma.estudiante.findFirst({
      where: { activo: true },
      include: {
        calificaciones: {
          where:   { publicado: true },
          include: { asignatura: { select: { nombre: true, codigo: true } } },
          orderBy: { creadoEn: "desc" },
        },
      },
    });

    if (!estudiante) return NextResponse.json({ calificaciones: [] });
    return NextResponse.json({ calificaciones: estudiante.calificaciones });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener rendimiento." }, { status: 500 });
  }
}
