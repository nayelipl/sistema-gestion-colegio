import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const {
      titulo,
      descripcion,
      fechaDesde,
      fechaHasta,
      tipo,
      cuotasVencidas,
      columnas,
      totalPendiente,
      totalCobrado,
      datos,
    } = await req.json();

    const usuarioId = parseInt((session.user as any).id);
    const rol = (session.user as any).role;

    const informeExistente = await prisma.informeCuentaPorCobrar.findUnique({
      where: { id: parseInt(id) }
    });

    if (!informeExistente) {
      return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
    }

    if (informeExistente.creadoPor !== usuarioId && !["ADMINISTRADOR", "CONTADOR"].includes(rol)) {
      return NextResponse.json({ error: "No tiene permisos para editar este informe" }, { status: 403 });
    }

    if (informeExistente.anulado) {
      return NextResponse.json({ error: "No se puede editar un informe anulado" }, { status: 400 });
    }

    if (!titulo || titulo.trim() === "") {
      return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
    }

    // Convertir fechas de string a Date
    const fechaDesdeDate = fechaDesde ? new Date(fechaDesde) : null;
    const fechaHastaDate = fechaHasta ? new Date(fechaHasta) : null;

    // Validar fechas
    if (fechaDesdeDate && isNaN(fechaDesdeDate.getTime())) {
    return NextResponse.json({ error: "Fecha desde inválida" }, { status: 400 });
    }
    if (fechaHastaDate && isNaN(fechaHastaDate.getTime())) {
    return NextResponse.json({ error: "Fecha hasta inválida" }, { status: 400 });
    }

    const informe = await prisma.informeCuentaPorCobrar.update({
      where: { id: parseInt(id) },
      data: {
        titulo: titulo.trim(),
        descripcion: descripcion || null,
        fechaDesde: fechaDesdeDate,
        fechaHasta: fechaHastaDate,
        tipo: tipo || "TODOS",
        cuotasVencidas: cuotasVencidas ? parseInt(cuotasVencidas) : null,
        columnas: JSON.stringify(columnas || {}),
        totalPendiente: totalPendiente || 0,
        totalCobrado: totalCobrado || 0,
        datos: JSON.stringify(datos || []),
        actualizadoEn: new Date(),
      },
    });
    
    return NextResponse.json({ informe });
  } catch (error) {
    console.error("Error PUT informe:", error);
    return NextResponse.json({ error: "Error al actualizar el informe" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { anulado } = await req.json();

    const usuarioId = parseInt((session.user as any).id);
    const usuarioNombre = (session.user as any).name || (session.user as any).email || "USUARIO";
    const rol = (session.user as any).role;

    const informeExistente = await prisma.informeCuentaPorCobrar.findUnique({
      where: { id: parseInt(id) }
    });

    if (!informeExistente) {
      return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
    }

    if (informeExistente.creadoPor !== usuarioId && !["ADMINISTRADOR", "CONTADOR"].includes(rol)) {
      return NextResponse.json({ error: "No tiene permisos para anular este informe" }, { status: 403 });
    }

    // Si se está anulando, modificar el título
    let nuevoTitulo = informeExistente.titulo;
    if (anulado === true && !informeExistente.anulado) {
      nuevoTitulo = `[ANULADO POR ${usuarioNombre.toUpperCase()}] ${informeExistente.titulo}`;
    }

    const informe = await prisma.informeCuentaPorCobrar.update({
      where: { id: parseInt(id) },
      data: {
        anulado: anulado === true,
        titulo: nuevoTitulo,
        actualizadoEn: new Date(),
      },
    });
    
    return NextResponse.json({ informe });
  } catch (error) {
    console.error("Error PATCH informe:", error);
    return NextResponse.json({ error: "Error al anular el informe" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const rol = (session.user as any).role;

    const informeExistente = await prisma.informeCuentaPorCobrar.findUnique({
      where: { id: parseInt(id) }
    });

    if (!informeExistente) {
      return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
    }

    if (rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No tiene permisos para eliminar informes" }, { status: 403 });
    }

    await prisma.informeCuentaPorCobrar.delete({
      where: { id: parseInt(id) }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error DELETE informe:", error);
    return NextResponse.json({ error: "Error al eliminar el informe" }, { status: 500 });
  }
}
