import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ajustarFechasAPI } from "@/lib/ajustar-fechas";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Obtener ID desde la URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const idFromUrl = pathSegments[pathSegments.length - 1];
    
    console.log("=== PUT /api/financiero/reporte-ingresos/[id] ===");
    console.log("URL completa:", req.url);
    console.log("Pathname:", url.pathname);
    console.log("ID desde URL:", idFromUrl);
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    console.log("Params recibido:", params);
    console.log("Params.id:", id);
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rol = (session.user as any)?.role;
    if (!["ADMINISTRADOR", "CONTADOR", "CAJERO"].includes(rol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    // Usar el ID desde la URL
    console.log("ID parseado:", id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    console.log("Estado recibido:", body.estado);

    const { 
      fechaDesde, 
      fechaHasta, 
      realizadoPor, 
      recibos, 
      totalRecibos, 
      totalMonto, 
      saldoInicial, 
      saldoFinal, 
      denominaciones, 
      estado
    } = body;

    const { fechaDesde: fechaDesdeAjustada, fechaHasta: fechaHastaAjustada } = ajustarFechasAPI(
      fechaDesde,
      fechaHasta
    );

    // Verificar si el reporte existe
    const reporteExistente = await prisma.reporteIngreso.findUnique({
      where: { id }
    });

    if (!reporteExistente) {
      return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
    }

    if (reporteExistente.estado !== "BORRADOR") {
      return NextResponse.json({ error: "Solo se pueden editar reportes en estado BORRADOR" }, { status: 400 });
    }

    const updateData: any = {
      realizadoPor: realizadoPor || null,
      totalRecibos,
      totalMonto,
      saldoInicial,
      saldoFinal,
      estado,
      datos: JSON.stringify({ 
        recibos: recibos || [], 
        denominaciones: denominaciones || [] 
      }),
    };

    if (fechaDesdeAjustada) {
      updateData.fechaDesde = fechaDesdeAjustada;
    }
    if (fechaHastaAjustada) {
      updateData.fechaHasta = fechaHastaAjustada;
    }

    const reporte = await prisma.reporteIngreso.update({
      where: { id },
      data: updateData
    });

    console.log("Reporte actualizado exitosamente");

    return NextResponse.json({ 
      mensaje: "Reporte actualizado correctamente", 
      reporte 
    });

  } catch (error) {
    console.error("Error en PUT reporte-ingresos:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Error al actualizar el reporte" 
    }, { status: 500 });
  }
}
