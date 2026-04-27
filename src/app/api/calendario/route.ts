import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ROLES_GESTION = ["ADMINISTRADOR", "DIRECCION_ACADEMICA"];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const anio = searchParams.get("anio");

    const where: any = {};
    if (anio) where.anio = anio;

    const eventos = await prisma.calendarioEscolar.findMany({
      where,
      orderBy: { fechaInicio: "asc" },
    });

    return NextResponse.json({ eventos });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener el calendario." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol     = (session?.user as any)?.role;
    if (!ROLES_GESTION.includes(rol)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const { titulo, descripcion, fechaInicio, fechaFin, tipo, anio } = await req.json();
    if (!titulo || !fechaInicio || !tipo || !anio) {
      return NextResponse.json({ error: "Título, fecha de inicio, tipo y año son obligatorios." }, { status: 400 });
    }

    const evento = await prisma.calendarioEscolar.create({
      data: {
        titulo,
        descripcion: descripcion || null,
        fechaInicio: new Date(fechaInicio),
        fechaFin:    fechaFin ? new Date(fechaFin) : new Date(fechaInicio),
        tipo,
        anio,
        publicado:   false,
      },
    });

    return NextResponse.json({ mensaje: "Evento registrado.", evento }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol     = (session?.user as any)?.role;
    if (!ROLES_GESTION.includes(rol)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const { id, publicar, titulo, descripcion, fechaInicio, fechaFin, tipo } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    const data: any = {};
    if (titulo      !== undefined) data.titulo      = titulo;
    if (descripcion !== undefined) data.descripcion = descripcion;
    if (fechaInicio !== undefined) data.fechaInicio = new Date(fechaInicio);
    if (fechaFin    !== undefined) data.fechaFin    = new Date(fechaFin);
    if (tipo        !== undefined) data.tipo        = tipo;
    if (publicar    !== undefined) data.publicado   = publicar;

    const evento = await prisma.calendarioEscolar.update({
      where: { id: parseInt(id) },
      data,
    });

    return NextResponse.json({ mensaje: "Evento actualizado.", evento });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol     = (session?.user as any)?.role;
    if (!ROLES_GESTION.includes(rol)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    await prisma.calendarioEscolar.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ mensaje: "Evento eliminado." });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
