import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

const ROLES_VER      = ["ADMINISTRADOR","DIRECCION_ACADEMICA","COORDINACION_ACADEMICA","SECRETARIA_DOCENTE","MAESTRO","CAJERO","ORIENTADOR_ESCOLAR"];
const ROLES_ESCRIBIR = ["ADMINISTRADOR","DIRECCION_ACADEMICA","COORDINACION_ACADEMICA"];

export async function GET() {
  const permiso = await verificarPermiso(ROLES_VER);
  if (permiso.error)
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const cursos = await prisma.curso.findMany({
      orderBy: { codigo: "asc" },
      include: { secciones: true },
    });
    return NextResponse.json({ cursos });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener cursos." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const permiso = await verificarPermiso(ROLES_ESCRIBIR);
  if (permiso.error)
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { codigo, grado, nivel } = await req.json();
    if (!codigo || !grado || !nivel)
      return NextResponse.json({ error: "Código, grado y nivel son obligatorios." }, { status: 400 });

    const existe = await prisma.curso.findUnique({ where: { codigo } });
    if (existe)
      return NextResponse.json({ error: "Ya existe un curso con ese código." }, { status: 409 });

    const curso = await prisma.curso.create({ data: { codigo, grado, nivel } });
    return NextResponse.json({ mensaje: "Curso creado exitosamente.", curso }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
