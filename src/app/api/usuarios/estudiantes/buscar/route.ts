import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    const estudiantes = await prisma.estudiante.findMany({
      where: {
        OR: [
          { codigo: { contains: q } },
          { nombre: { contains: q } },
          { apellido: { contains: q } },
        ],
        activo: true,
      },
      include: {
        tutor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            cuentaNo: true,
          },
        },
        seccion: {
          include: {
            curso: true,
          },
        },
      },
      take: 20,
      orderBy: { nombre: "asc" },
    });

    const resultados = estudiantes.map((est) => ({
      value: est.id,
      label: `${est.codigo} - ${est.nombre} ${est.apellido}`,
      estudiante: {
        id: est.id,
        codigo: est.codigo,
        nombre: est.nombre,
        apellido: est.apellido,
        fechaNac: est.fechaNac,
        edad: est.edad,
        tutor: est.tutor,
        seccion: est.seccion,
      },
    }));

    return NextResponse.json(resultados);
  } catch (error) {
    console.error("Error GET /api/usuarios/estudiantes/buscar:", error);
    return NextResponse.json({ error: "Error al buscar estudiantes" }, { status: 500 });
  }
}
