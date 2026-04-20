import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuarioRol = (session.user as any)?.role;
    if (!["ADMINISTRADOR", "CONTADOR"].includes(usuarioRol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const tipo = searchParams.get("tipo");
    const cuotasVencidas = searchParams.get("cuotasVencidas");

    // Filtros para cargos pendientes
    const whereCargo: any = {
      estado: { in: ["PENDIENTE", "VENCIDO", "ABONADA"] },
      saldoPendiente: { gt: 0 },
    };

    if (fechaDesde) {
      whereCargo.fechaVencimiento = { ...whereCargo.fechaVencimiento, gte: new Date(fechaDesde) };
    }
    if (fechaHasta) {
      whereCargo.fechaVencimiento = { ...whereCargo.fechaVencimiento, lte: new Date(fechaHasta) };
    }
    if (tipo && tipo !== "TODOS") {
      whereCargo.tipo = tipo;
    }

    // Obtener todos los cargos pendientes
    const cargos = await prisma.cargo.findMany({
      where: whereCargo,
      include: {
        tutor: true,
        estudiante: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            codigo: true,
          },
        },
      },
      orderBy: [
        { tutorId: "asc" },
        { fechaVencimiento: "asc" },
      ],
    });

    // Agrupar por tutor para calcular totales
    const tutorMap = new Map();
    for (const cargo of cargos) {
      if (!tutorMap.has(cargo.tutorId)) {
        tutorMap.set(cargo.tutorId, {
          tutorId: cargo.tutorId,
          cuenta: cargo.tutor.cuentaNo,
          tutor: `${cargo.tutor.nombre} ${cargo.tutor.apellido}`,
          cargos: [],
          totalMonto: 0,
          totalPagado: 0,
        });
      }
      
      const tutorData = tutorMap.get(cargo.tutorId);
      tutorData.cargos.push(cargo);
      tutorData.totalMonto += Number(cargo.montoTotal);
      tutorData.totalPagado += Number(cargo.montoPagado);
    }

    // Filtrar por cantidad de cuotas vencidas si se especifica
    let resultados = Array.from(tutorMap.values());
    if (cuotasVencidas && parseInt(cuotasVencidas) > 0) {
      resultados = resultados.filter(t => 
        t.cargos.filter((c: any) => c.estado === "VENCIDO").length >= parseInt(cuotasVencidas)
      );
    }

    // Calcular totales generales
    const totalPendiente = resultados.reduce((sum, t) => sum + (t.totalMonto - t.totalPagado), 0);
    const totalCobrado = resultados.reduce((sum, t) => sum + t.totalPagado, 0);

    return NextResponse.json({
      cuentas: resultados,
      totalPendiente,
      totalCobrado,
      totalRegistros: resultados.length,
    });
  } catch (error) {
    console.error("Error GET /api/financiero/cuentas-por-cobrar:", error);
    return NextResponse.json({ error: "Error al obtener cuentas por cobrar" }, { status: 500 });
  }
}