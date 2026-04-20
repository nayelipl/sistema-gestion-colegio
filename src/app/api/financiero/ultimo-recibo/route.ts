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

    // Obtener el último número del contador RI
    const contador = await prisma.contador.findUnique({
      where: { id: "RI" }
    });

    let siguienteNumero = 1;
    if (contador) {
      siguienteNumero = contador.ultimoNumero + 1;
    }

    const reciboNo = `RI-${siguienteNumero.toString().padStart(10, "0")}`;

    return NextResponse.json({ reciboNo });
  } catch (error) {
    console.error("Error obteniendo último recibo:", error);
    return NextResponse.json(
      { error: "Error al obtener el último recibo" },
      { status: 500 }
    );
  }
}
