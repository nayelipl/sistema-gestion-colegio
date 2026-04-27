import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ROLES_REGISTRAR = ["MAESTRO", "ADMINISTRADOR", "SECRETARIA_DOCENTE"];
const ROLES_PUBLICAR  = ["SECRETARIA_DOCENTE", "ADMINISTRADOR"];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol     = (session?.user as any)?.role;
    const email   = session?.user?.email;

    const { searchParams } = new URL(req.url);
    const fecha      = searchParams.get("fecha");
    const seccionId  = searchParams.get("seccionId");
    const soloPublicadas = searchParams.get("soloPublicadas");

    const where: any = {};

    if (fecha) {
      const inicio = new Date(fecha);
      const fin    = new Date(fecha);
      fin.setDate(fin.getDate() + 1);
      where.fecha  = { gte: inicio, lt: fin };
    }

    // Filtrar por sección derivada del estudiante
    if (seccionId) {
      where.estudiante = { seccionId: parseInt(seccionId) };
    }

    if (soloPublicadas === "1") where.publicado = true;

    // Maestro solo ve sus secciones
    if (rol === "MAESTRO") {
      const empleado = await prisma.empleado.findUnique({ where: { email: email! } });
      if (empleado) {
        const asignaciones = await prisma.asignacionMaestro.findMany({ where: { maestroId: empleado.id } });
        const seccionIds   = asignaciones.map(a => a.seccionId);
        where.estudiante   = { ...(where.estudiante || {}), seccionId: { in: seccionIds } };
      }
    }

    // Tutores y estudiantes solo ven publicadas
    if (rol === "TUTOR" || rol === "ESTUDIANTE") {
      where.publicado = true;
    }

    const asistencias = await prisma.asistencia.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
      include: {
        estudiante: { select: { nombre: true, apellido: true, codigo: true, seccionId: true } },
      },
    });

    return NextResponse.json({ asistencias });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener asistencias." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol     = (session?.user as any)?.role;

    if (!ROLES_REGISTRAR.includes(rol)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const { registros, fecha, seccionId } = await req.json();
    if (!registros || !fecha || !seccionId) {
      return NextResponse.json({ error: "Registros, fecha y sección son obligatorios." }, { status: 400 });
    }

    const fechaDate = new Date(fecha);
    const inicio    = new Date(fecha);
    const fin       = new Date(fecha);
    fin.setDate(fin.getDate() + 1);

    // Eliminar solo los de esa sección en esa fecha
    const estudiantesSeccion = await prisma.estudiante.findMany({
      where: { seccionId: parseInt(seccionId) },
      select: { id: true },
    });
    const ids = estudiantesSeccion.map(e => e.id);

    await prisma.asistencia.deleteMany({
      where: { fecha: { gte: inicio, lt: fin }, estudianteId: { in: ids } },
    });

    await prisma.asistencia.createMany({
      data: registros.map((r: any) => ({
        estudianteId: r.estudianteId,
        fecha:        fechaDate,
        estado:       r.estado,
        publicado:    false,
      })),
    });

    return NextResponse.json({ mensaje: "Asistencia registrada exitosamente." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol     = (session?.user as any)?.role;
    const email   = session?.user?.email;

    if (!ROLES_PUBLICAR.includes(rol)) {
      return NextResponse.json({ error: "Solo la Secretaría Docente puede publicar asistencia." }, { status: 403 });
    }

    const { fecha, seccionId, publicar } = await req.json();
    if (!fecha || !seccionId) {
      return NextResponse.json({ error: "Fecha y sección son obligatorios." }, { status: 400 });
    }

    const inicio = new Date(fecha);
    const fin    = new Date(fecha);
    fin.setDate(fin.getDate() + 1);

    const estudiantesSeccion = await prisma.estudiante.findMany({
      where: { seccionId: parseInt(seccionId) },
      select: { id: true },
    });
    const ids = estudiantesSeccion.map(e => e.id);

    await prisma.asistencia.updateMany({
      where: { fecha: { gte: inicio, lt: fin }, estudianteId: { in: ids } },
      data:  { publicado: publicar, publicadoPor: publicar ? email : null },
    });

    return NextResponse.json({ mensaje: publicar ? "Asistencia publicada." : "Asistencia despublicada." });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
