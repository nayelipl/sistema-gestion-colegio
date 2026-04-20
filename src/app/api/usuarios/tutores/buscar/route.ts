import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    let searchTerm = query.trim();

    let cuentaNoFormatted = searchTerm;
    if (/^\d+$/.test(searchTerm)) {
      cuentaNoFormatted = searchTerm.padStart(6, "0");
    }

    const tutores = await prisma.tutor.findMany({
      where: {
        OR: [
          { cuentaNo: { contains: cuentaNoFormatted } },
          { nombre: { contains: searchTerm } },
          { apellido: { contains: searchTerm } },
          { email: { contains: searchTerm } },
          { numeroDocIdentidad: { contains: searchTerm } },
        ],
      },
      take: 20, // Limitar resultados para performance
      select: {
        id: true,
        cuentaNo: true,
        nombre: true,
        apellido: true,
        email: true,
        numeroDocIdentidad: true,
        tipoDocIdentidad: true,
        celular: true,
        telefonoResidencial: true,
        telefonoTrabajo: true,
        ocupacion: true,
        direccion: true,
      },
      orderBy: [{ cuentaNo: "asc" }],
    });

    return NextResponse.json(tutores);
  } catch (error) {
    console.error("Error buscando tutores:", error);
    return NextResponse.json({ error: "Error en la búsqueda" }, { status: 500 });
  }
}
