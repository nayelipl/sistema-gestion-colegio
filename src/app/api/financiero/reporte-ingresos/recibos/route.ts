import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ajustarFechasAPI } from "@/lib/ajustar-fechas";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rol = (session.user as any)?.role;
    if (!["ADMINISTRADOR", "CONTADOR", "CAJERO"].includes(rol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const realizadoPor = searchParams.get("realizadoPor");
    const origen = searchParams.get("origen");

    const { fechaDesde: fechaInicio, fechaHasta: fechaFin } = ajustarFechasAPI(
      fechaDesde || undefined,
      fechaHasta || undefined
    );

    const where: any = {};
    
    if (fechaDesde) {
      where.fecha = { gte: fechaInicio };
    }
    if (fechaHasta) {
      where.fecha = { ...where.fecha, lte: fechaFin };
    }
    if (realizadoPor && realizadoPor !== "TODOS") {
      where.realizadoPor = realizadoPor;
    }
    if (origen) {
      where.origen = origen;
    }

    console.log("Filtro where:", JSON.stringify(where, null, 2));

    // Obtener IDs de recibos que tienen pagos
    const recibosConPagosIds = await prisma.pagoCargo.findMany({
      where: {
        recibo: {
          ...where,
          anulado: false,
        }
      },
      select: { reciboId: true },
      distinct: ['reciboId'],
    });

    const idsRecibosConPagos = recibosConPagosIds.map(p => p.reciboId);
    console.log("IDs de recibos con pagos:", idsRecibosConPagos.length);

// Obtener recibos de cargos usando los IDs
    const recibosConCargos = await prisma.reciboPago.findMany({
      where: {
        ...where,
        id: { in: idsRecibosConPagos },
        anulado: false,
      },
      include: {
        tutor: { select: { cuentaNo: true, nombre: true, apellido: true } },
        pagos: { 
          include: { 
            cargo: true 
          } 
        }
      },
      orderBy: { fecha: "desc" }
    });

    console.log("Recibos con cargos encontrados:", recibosConCargos.length);
    recibosConCargos.forEach(r => {
      console.log(`  - ${r.reciboNo}: ${r.concepto} (${r.realizadoPor})`);
    });

    // Recibos de otros ingresos, no tienen cargos asociados
    const recibosOtrosIngresos = await prisma.reciboPago.findMany({
      where: {
        ...where,
        id: { notIn: idsRecibosConPagos },
        anulado: false,
        concepto: { not: null }
      },
      include: {
        tutor: { select: { cuentaNo: true, nombre: true, apellido: true } }
      },
      orderBy: { fecha: "desc" }
    });

    console.log("Recibos otros ingresos encontrados:", recibosOtrosIngresos.length);

    const ventasUniforme = await prisma.ventaUniforme.findMany({
      where: {
        fecha: {
          gte: fechaInicio,
          lte: fechaFin,
        },
        cancelado: false,
      },
      include: {
        estudiante: {
          include: {
            tutor: {
              select: { cuentaNo: true, nombre: true, apellido: true }
            }
          }
        }
      },
      orderBy: { fecha: "desc" }
    });
    
    // Formatear recibos de cargos
    const recibosFormateados = [];

    // Recibos con cargos
    for (const recibo of recibosConCargos) {
      for (const pago of recibo.pagos) {
        const cargo = pago.cargo;
        const concepto = cargo?.tipo || "OTRO";
        
        recibosFormateados.push({
          id: recibo.id,
          reciboNo: recibo.reciboNo,
          fecha: recibo.fecha,
          cuenta: recibo.tutor?.cuentaNo || "",
          tutor: `${recibo.tutor?.nombre || ""} ${recibo.tutor?.apellido || ""}`.trim(),
          concepto: concepto,
          monto: pago.montoPagado.toNumber(),
          usuario: recibo.realizadoPor,
          metodoPago: recibo.metodoPago,
          tipo: "CARGO",
          origen: (recibo as any).origen || "PRESENCIAL",
        });
      }
    }

    // Recibos de otros ingresos
    for (const recibo of recibosOtrosIngresos) {
      recibosFormateados.push({
        id: recibo.id,
        reciboNo: recibo.reciboNo,
        fecha: recibo.fecha,
        cuenta: recibo.tutor?.cuentaNo || "",
        tutor: `${recibo.tutor?.nombre || ""} ${recibo.tutor?.apellido || ""}`.trim(),
        concepto: recibo.concepto || "OTRO",
        monto: recibo.total.toNumber(),
        usuario: recibo.realizadoPor,
        metodoPago: recibo.metodoPago,
        tipo: "OTRO_INGRESO",
        origen: (recibo as any).origen || "PRESENCIAL",
      });
    }

    // Ventas de uniformes, solo incluir si no se está filtrando por origen EN_LINEA
    if (origen !== "EN_LINEA") {
      for (const venta of ventasUniforme) {
        recibosFormateados.push({
          id: venta.id,
          reciboNo: venta.ventaNo,
          fecha: venta.fecha,
          cuenta: venta.estudiante?.tutor?.cuentaNo || "",
          tutor: `${venta.estudiante?.tutor?.nombre || ""} ${venta.estudiante?.tutor?.apellido || ""}`.trim(),
          concepto: "UNIFORME",
          monto: Number(venta.total),
          usuario: venta.realizadoPor === "admin@colegio.edu" ? "Administrador" : venta.realizadoPor,
          metodoPago: venta.metodoPago,
          tipo: "UNIFORME",
          origen: "PRESENCIAL",
        });
      }
    }

    // Ordenar por fecha
    recibosFormateados.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    const totalRecibos = recibosFormateados.length;
    const totalMonto = recibosFormateados.reduce((sum, r) => sum + r.monto, 0);

    return NextResponse.json({
      recibos: recibosFormateados,
      totalRecibos,
      totalMonto,
    });

  } catch (error) {
    console.error("Error GET reporte ingresos recibos:", error);
    return NextResponse.json({ error: "Error al obtener recibos" }, { status: 500 });
  }
}
