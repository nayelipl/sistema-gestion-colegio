import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ROLES_GESTION = ["ADMINISTRADOR", "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA", "SECRETARIA_DOCENTE"];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol     = (session?.user as any)?.role;

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");

    const where: any = {};
    if (tipo) where.tipo = tipo;

    // Tutores y estudiantes solo ven publicadas y dirigidas a ellos
    if (rol === "TUTOR" || rol === "ESTUDIANTE") {
      where.publicado    = true;
      where.destinatario = { in: [rol, "TODOS"] };
    }

    // Maestros ven las suyas y las dirigidas a ellos
    if (rol === "MAESTRO") {
      where.OR = [
        { destinatario: { in: ["MAESTRO", "TODOS"] }, publicado: true },
        { destinatario: "INTERNO" },
      ];
    }

    const publicaciones = await prisma.publicacion.findMany({
      where,
      orderBy: { creadoEn: "desc" },
    });

    return NextResponse.json({ publicaciones });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener publicaciones." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol     = (session?.user as any)?.role;
    const email   = session?.user?.email;

    if (!ROLES_GESTION.includes(rol)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const { titulo, contenido, tipo, destinatario } = await req.json();
    if (!titulo || !contenido || !tipo || !destinatario) {
      return NextResponse.json({ error: "Título, contenido, tipo y destinatario son obligatorios." }, { status: 400 });
    }

    const publicacion = await prisma.publicacion.create({
      data: {
        titulo,
        contenido,
        tipo,
        destinatario,
        publicado:   false,
        creadoPor:   email!,
      },
    });

    return NextResponse.json({ mensaje: "Comunicado creado exitosamente.", publicacion }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol     = (session?.user as any)?.role;
    const email   = session?.user?.email;

    if (!ROLES_GESTION.includes(rol)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const { id, publicar, titulo, contenido, tipo, destinatario } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    const data: any = {};
    if (titulo       !== undefined) data.titulo       = titulo;
    if (contenido    !== undefined) data.contenido    = contenido;
    if (tipo         !== undefined) data.tipo         = tipo;
    if (destinatario !== undefined) data.destinatario = destinatario;
    if (publicar     !== undefined) {
      data.publicado    = publicar;
      data.publicadoPor = publicar ? email : null;
      data.publicadoEn  = publicar ? new Date() : null;
    }

    const publicacion = await prisma.publicacion.update({
      where: { id: parseInt(id) },
      data,
    });

    return NextResponse.json({ mensaje: "Comunicado actualizado.", publicacion });
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

    await prisma.publicacion.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ mensaje: "Comunicado eliminado." });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
