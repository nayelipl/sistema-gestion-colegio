import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const empleado = await prisma.empleado.findUnique({
      where:  { email: session.user.email },
      select: { salario: true },
    });
    return NextResponse.json({ salario: empleado?.salario ?? null });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener nómina." }, { status: 500 });
  }
}
