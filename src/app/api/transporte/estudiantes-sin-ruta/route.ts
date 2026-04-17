import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

export async function GET() {
    
    const permiso = await verificarPermiso(["ADMINISTRADOR", "CONTADOR", "CAJERO"]);
        if (permiso.error) {
        return NextResponse.json({ error: permiso.error }, { status: permiso.status });
        }
    
    try {
        // Obtener IDs de estudiantes que ya tienen ruta activa
        const estudiantesConRuta = await prisma.estudianteRuta.findMany({
        where: {
            activo: true,
            fechaFin: null,
        },
        select: {
            estudianteId: true,
        },
        });

        const estudiantesConRutaIds = estudiantesConRuta.map((er) => er.estudianteId);

        // Obtener estudiantes sin ruta activa
        const estudiantes = await prisma.estudiante.findMany({
        where: {
            id: { notIn: estudiantesConRutaIds },
            activo: true,
        },
        select: {
            id: true,
            nombre: true,
            apellido: true,
            codigo: true,
            direccion: true,
        },
        orderBy: {
            nombre: "asc",
        },
        });

        const estudiantesFormateados = estudiantes.map((est) => ({
        id: est.id,
        nombre: est.nombre,
        apellido: est.apellido,
        codigo: est.codigo,
        direccion: est.direccion || null,
        }));

        return NextResponse.json(estudiantesFormateados);
    } catch (error) {
        console.error("Error GET /api/transporte/estudiantes-sin-ruta:", error);
        return NextResponse.json(
        { error: "Error al obtener los estudiantes" },
        { status: 500 }
        );
  }
}
