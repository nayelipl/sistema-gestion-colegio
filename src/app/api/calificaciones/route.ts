import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ROLES_MAESTRO = ["MAESTRO"];
const ROLES_SECRETARIA = ["SECRETARIA_DOCENTE", "ADMINISTRADOR"];
const ROLES_VER = ["ADMINISTRADOR", "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA", "SECRETARIA_DOCENTE", "MAESTRO"];

function calcularNotas(data: any) {
  const p1 = parseFloat(data.prueba1) || 0;
  const p2 = parseFloat(data.prueba2) || 0;
  const p3 = parseFloat(data.prueba3) || 0;
  const p4 = parseFloat(data.prueba4) || 0;
  const notaPruebas = (p1 + p2 + p3 + p4) / 4;

  const pr1 = parseFloat(data.practica1) || 0;
  const pr2 = parseFloat(data.practica2) || 0;
  const notaPracticas = (pr1 + pr2) / 2;

  const trabajoFinal = parseFloat(data.trabajoFinal) || 0;
  const asistencia   = parseFloat(data.asistencia)   || 0;

  const notaFinal =
    notaPruebas   * 0.50 +
    notaPracticas * 0.15 +
    trabajoFinal  * 0.20 +
    asistencia    * 0.15;

  const condicion = notaFinal >= 6 ? "APROBADO" : "REPROBADO";

  return { notaPruebas, notaPracticas, notaFinal, condicion };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol     = (session?.user as any)?.role;
    const email   = session?.user?.email;

    const { searchParams } = new URL(req.url);
    const estudianteId = searchParams.get("estudianteId");
    const seccionId    = searchParams.get("seccionId");
    const periodo      = searchParams.get("periodo");
    const soloPublicadas = searchParams.get("soloPublicadas");

    const where: any = {};
    if (estudianteId) where.estudianteId = parseInt(estudianteId);
    if (seccionId)    where.seccionId    = parseInt(seccionId);
    if (periodo)      where.periodo      = periodo;
    if (soloPublicadas === "1") where.publicado = true;

    // Si es maestro, solo ve sus secciones asignadas
    if (rol === "MAESTRO") {
      const empleado = await prisma.empleado.findUnique({ where: { email: email! } });
      if (empleado) {
        const asignaciones = await prisma.asignacionMaestro.findMany({ where: { maestroId: empleado.id } });
        const seccionIds   = asignaciones.map(a => a.seccionId);
        where.seccionId    = { in: seccionIds };
      }
    }

    // Tutores y estudiantes solo ven publicadas
    if (rol === "TUTOR" || rol === "ESTUDIANTE") {
      where.publicado = true;
    }

    const calificaciones = await prisma.calificacion.findMany({
      where,
      orderBy: [{ periodo: "asc" }, { creadoEn: "desc" }],
      include: {
        estudiante: { select: { nombre: true, apellido: true, codigo: true } },
        asignatura: { select: { nombre: true, codigo: true } },
        seccion:    { select: { aula: true, curso: { select: { grado: true } } } },
      },
    });

    return NextResponse.json({ calificaciones });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener calificaciones." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol     = (session?.user as any)?.role;
    const email   = session?.user?.email;

    if (!ROLES_MAESTRO.includes(rol) && !ROLES_SECRETARIA.includes(rol)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const body = await req.json();
    const { estudianteId, asignaturaId, seccionId, periodo, prueba1, prueba2, prueba3, prueba4, practica1, practica2, trabajoFinal, asistencia } = body;

    if (!estudianteId || !asignaturaId || !seccionId || !periodo) {
      return NextResponse.json({ error: "Estudiante, asignatura, sección y período son obligatorios." }, { status: 400 });
    }

    const { notaPruebas, notaPracticas, notaFinal, condicion } = calcularNotas(body);

    // Si ya existe, actualizar
    const existente = await prisma.calificacion.findFirst({
      where: { estudianteId: parseInt(estudianteId), asignaturaId: parseInt(asignaturaId), seccionId: parseInt(seccionId), periodo },
    });

    if (existente) {
      const actualizada = await prisma.calificacion.update({
        where: { id: existente.id },
        data: {
          prueba1: parseFloat(prueba1) || null, prueba2: parseFloat(prueba2) || null,
          prueba3: parseFloat(prueba3) || null, prueba4: parseFloat(prueba4) || null,
          notaPruebas,
          practica1: parseFloat(practica1) || null, practica2: parseFloat(practica2) || null,
          notaPracticas,
          trabajoFinal: parseFloat(trabajoFinal) || null,
          asistencia: parseFloat(asistencia) || null,
          notaFinal, condicion,
          registradoPor: email!,
          publicado: false,
        },
      });
      return NextResponse.json({ mensaje: "Calificación actualizada.", calificacion: actualizada });
    }

    const calificacion = await prisma.calificacion.create({
      data: {
        estudianteId: parseInt(estudianteId), asignaturaId: parseInt(asignaturaId),
        seccionId: parseInt(seccionId), periodo,
        prueba1: parseFloat(prueba1) || null, prueba2: parseFloat(prueba2) || null,
        prueba3: parseFloat(prueba3) || null, prueba4: parseFloat(prueba4) || null,
        notaPruebas,
        practica1: parseFloat(practica1) || null, practica2: parseFloat(practica2) || null,
        notaPracticas,
        trabajoFinal: parseFloat(trabajoFinal) || null,
        asistencia: parseFloat(asistencia) || null,
        notaFinal, condicion,
        registradoPor: email!,
      },
    });

    return NextResponse.json({ mensaje: "Calificación registrada.", calificacion }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol     = (session?.user as any)?.role;
    const email   = session?.user?.email;

    if (!ROLES_SECRETARIA.includes(rol)) {
      return NextResponse.json({ error: "Solo la Secretaría Docente puede publicar calificaciones." }, { status: 403 });
    }

    const { id, publicar } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    const calificacion = await prisma.calificacion.update({
      where: { id: parseInt(id) },
      data: {
        publicado:    publicar,
        publicadoPor: publicar ? email! : null,
        publicadoEn:  publicar ? new Date() : null,
      },
    });

    return NextResponse.json({ mensaje: publicar ? "Calificación publicada." : "Calificación despublicada.", calificacion });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
