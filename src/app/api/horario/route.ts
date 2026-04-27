import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ROLES_GESTION = ["ADMINISTRADOR", "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA"];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seccionId = searchParams.get("seccionId");

    const where: any = {};
    if (seccionId) where.seccionId = parseInt(seccionId);

    const horarios = await prisma.horario.findMany({
      where,
      include: {
        seccion: { include: { curso: true } },
        asignacion: {
          include: {
            maestro: { select: { nombre: true, apellido: true } },
            asignatura: { select: { nombre: true, codigo: true } },
          },
        },
      },
      orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
    });

    return NextResponse.json({ horarios });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener horarios." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol = (session?.user as any)?.role;
    if (!ROLES_GESTION.includes(rol)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const { diaSemana, horaInicio, horaFin, seccionId, asignacionId } = await req.json();
    if (!diaSemana || !horaInicio || !horaFin || !seccionId || !asignacionId) {
      return NextResponse.json({ error: "Todos los campos son obligatorios." }, { status: 400 });
    }

    const conflicto = await prisma.horario.findFirst({
      where: {
        seccionId: parseInt(seccionId),
        diaSemana: parseInt(diaSemana),
        OR: [
          { horaInicio: { gte: horaInicio, lt: horaFin } },
          { horaFin: { gt: horaInicio, lte: horaFin } },
          { horaInicio: { lte: horaInicio }, horaFin: { gte: horaFin } },
        ],
      },
    });

    if (conflicto) {
      return NextResponse.json({ error: "Ya existe un horario en ese día y hora para esta sección." }, { status: 409 });
    }

    const horario = await prisma.horario.create({
      data: {
        diaSemana: parseInt(diaSemana),
        horaInicio,
        horaFin,
        seccionId: parseInt(seccionId),
        asignacionId: parseInt(asignacionId),
      },
      include: {
        asignacion: {
          include: {
            maestro: { select: { nombre: true, apellido: true } },
            asignatura: { select: { nombre: true } },
          },
        },
      },
    });

    return NextResponse.json({ mensaje: "Horario registrado.", horario }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol = (session?.user as any)?.role;
    if (!ROLES_GESTION.includes(rol)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    await prisma.horario.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ mensaje: "Horario eliminado." });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
