import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

// Listar estudiantes vinculados al servicio de transporte
export async function GET(req: NextRequest) {
  const permiso = await verificarPermiso(["ADMINISTRADOR", "CONTADOR", "CAJERO"]);
  if (permiso.error) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado");
    const tipo = searchParams.get("tipo");
    const estudianteId = searchParams.get("estudianteId");

    const where: any = {};
    if (estado && estado !== "TODOS") where.estado = estado;
    if (tipo && tipo !== "TODOS") where.tipo = tipo;
    if (estudianteId) where.estudianteId = parseInt(estudianteId);

    const vinculaciones = await prisma.transporteEstudiante.findMany({
      where,
      include: {
        estudiante: {
          include: { tutor: true },
        },
        tutor: true,
      },
      orderBy: { creadoEn: "desc" },
    });

    const totalActivos = vinculaciones.filter((v) => v.estado === "ACTIVO").length;
    const totalSuspendidos = vinculaciones.filter((v) => v.estado === "SUSPENDIDO").length;
    const totalCancelados = vinculaciones.filter((v) => v.estado === "CANCELADO").length;
    const montoTotal = vinculaciones.reduce((sum, v) => sum + Number(v.montoTotal), 0);

    return NextResponse.json({
      vinculaciones,
      estadisticas: {
        total: vinculaciones.length,
        activos: totalActivos,
        suspendidos: totalSuspendidos,
        cancelados: totalCancelados,
        montoTotal,
      },
    });
  } catch (error) {
    console.error("Error GET /api/transporte/vinculaciones:", error);
    return NextResponse.json({ error: "Error al obtener vinculaciones" }, { status: 500 });
  }
}
