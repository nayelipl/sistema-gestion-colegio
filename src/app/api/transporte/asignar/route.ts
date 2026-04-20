import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

export async function POST(request: Request) {

    const permiso = await verificarPermiso(["ADMINISTRADOR", "CONTADOR", "CAJERO"]);
    if (permiso.error) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
    }

  try {
    const { estudianteId, rutaId, puntoRecogida } = await request.json();

    if (!estudianteId || !rutaId) {
      return NextResponse.json(
        { error: "Faltan datos: estudianteId y rutaId son requeridos" },
        { status: 400 }
      );
    }

    // Verificar si el estudiante ya tiene una ruta activa
    const asignacionExistente = await prisma.estudianteRuta.findFirst({
      where: {
        estudianteId,
        activo: true,
        fechaFin: null,
      },
    });

    if (asignacionExistente) {
      // Desactivar la asignación anterior
      await prisma.estudianteRuta.update({
        where: { id: asignacionExistente.id },
        data: {
          activo: false,
          fechaFin: new Date(),
        },
      });
    }

    // Verificar capacidad de la ruta
    const ruta = await prisma.ruta.findUnique({
      where: { id: rutaId },
      include: {
        asignaciones: {
          where: {
            activo: true,
            fechaFin: null,
          },
        },
      },
    });

    if (!ruta) {
      return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 });
    }

    if (ruta.asignaciones.length >= ruta.capacidad) {
      return NextResponse.json(
        { error: "La ruta ha alcanzado su capacidad máxima" },
        { status: 400 }
      );
    }

    // Crear nueva asignación
    const asignacion = await prisma.estudianteRuta.create({
      data: {
        estudianteId,
        rutaId,
        puntoRecogida: puntoRecogida || null,
        fechaInicio: new Date(),
        activo: true,
      },
      include: {
        estudiante: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            codigo: true,
          },
        },
        ruta: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    return NextResponse.json(asignacion, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/transporte/asignar:", error);
    return NextResponse.json(
      { error: "Error al asignar el estudiante" },
      { status: 500 }
    );
  }
}