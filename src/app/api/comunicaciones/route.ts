import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const publicaciones = await prisma.publicacion.findMany({
      orderBy: { creadoEn: "desc" },
    });
    return NextResponse.json({ publicaciones });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener publicaciones." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { titulo, contenido, tipo } = await req.json();
    if (!titulo || !contenido) {
      return NextResponse.json({ error: "Título y contenido son obligatorios." }, { status: 400 });
    }
    const publicacion = await prisma.publicacion.create({
      data: { titulo, contenido, tipo: tipo || "COMUNICADO" },
    });
    return NextResponse.json({ mensaje: "Publicación creada exitosamente.", publicacion }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
