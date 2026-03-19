import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const tutor = await prisma.tutor.findUnique({
      where: { email: session.user.email },
      include: {
        estudiantes: {
          include: {
            seccion: { include: { curso: true } },
          },
        },
      },
    });

    if (!tutor) return NextResponse.json({ estudiantes: [] });
    return NextResponse.json({ estudiantes: tutor.estudiantes });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener representados." }, { status: 500 });
  }
}
