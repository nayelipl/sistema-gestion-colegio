import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

export async function GET() {

    const permiso = await verificarPermiso(["ADMINISTRADOR", "CONTADOR", "CAJERO"]);
    if (permiso.error) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
    }

  try {
    const rutas = await prisma.ruta.findMany({
      include: {
        asignaciones: {
          where: { activo: true, fechaFin: null },
          include: {
            estudiante: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                codigo: true,
              },
            },
          },
        },
      },
      orderBy: { creadoEn: "desc" },
    });

    return NextResponse.json(rutas);
  } catch (error) {
    console.error("Error GET /api/transporte/rutas:", error);
    return NextResponse.json(
      { error: "Error al obtener las rutas" },
      { status: 500 }
    );
  }
}

// POST - Crear nueva ruta
export async function POST(request: Request) {

    const permiso = await verificarPermiso(["ADMINISTRADOR", "CONTADOR", "CAJERO"]);
    if (permiso.error) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
    }

  try {
    const formData = await request.formData();
    const puntosRecorrido = JSON.parse(
      (formData.get("puntosRecorrido") as string) || "[]"
    );

    const ruta = await prisma.ruta.create({
      data: {
        nombre: formData.get("nombre") as string,
        descripcion: (formData.get("descripcion") as string) || null,
        horarioRecogida: formData.get("horarioRecogida") as string,
        horarioRegreso: (formData.get("horarioRegreso") as string) || null,
        conductor: (formData.get("conductor") as string) || null,
        telefonoConductor: (formData.get("telefonoConductor") as string) || null,
        capacidad: parseInt(formData.get("capacidad") as string) || 20,
        puntosRecorrido,
        activo: true,
      },
    });

    return NextResponse.json(ruta, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/transporte/rutas:", error);
    return NextResponse.json(
      { error: "Error al crear la ruta" },
      { status: 500 }
    );
  }
}
