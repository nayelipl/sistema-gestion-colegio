import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const buscar = searchParams.get("buscar");

    const where = buscar ? {
      OR: [
        { codigo: { contains: buscar } },
        { nombre: { contains: buscar } },
        { apellido: { contains: buscar } },
        { cedula: { contains: buscar } }
      ]
    } : {};

    const tutores = await prisma.tutor.findMany({
      where,
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        cuentaNo: true,
        nombre: true,
        apellido: true,
        numeroDocIdentidad: true,
        email: true,
        celular: true,
      }
    });

    return NextResponse.json(tutores);
  } catch (error) {
    console.error("Error GET /api/usuarios/tutores:", error);
    return NextResponse.json({ error: "Error al obtener tutores" }, { status: 500 });
  }
}
