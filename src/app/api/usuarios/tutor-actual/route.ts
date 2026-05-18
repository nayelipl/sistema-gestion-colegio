import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const email = session.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Email no encontrado" }, { status: 400 });
    }

    // Buscar el tutor por email (el email es único en la tabla Tutor)
    const tutor = await prisma.tutor.findUnique({
      where: { email: email },
      select: { id: true }
    });

    if (!tutor) {
      return NextResponse.json({ error: "No se encontró un tutor asociado a este email" }, { status: 404 });
    }

    return NextResponse.json({ tutorId: tutor.id });
  } catch (error) {
    console.error("Error obteniendo tutor actual:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
