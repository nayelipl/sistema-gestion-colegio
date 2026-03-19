import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const uniformes = await prisma.uniforme.findMany({ orderBy: { creadoEn: "desc" } });
    return NextResponse.json({ uniformes });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener inventario." }, { status: 500 });
  }
}
