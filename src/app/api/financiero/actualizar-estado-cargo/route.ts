import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { EstadoCargo, EstadoCuenta } from "@prisma/client";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Obtener la tarifa activa para conocer los días de gracia
    const tarifaActiva = await prisma.tarifaAnioEscolar.findFirst({
      where: { activo: true },
      select: { colegiaturaDiasGracia: true, anioEscolar: true }
    });

    const diasGracia = tarifaActiva?.colegiaturaDiasGracia || 0;
    
    // Calcular fecha límite para considerar vencido: hoy - días de gracia
    const fechaLimiteVencimiento = new Date(hoy);
    fechaLimiteVencimiento.setDate(fechaLimiteVencimiento.getDate() - diasGracia);

    // 1. Actualizar cargos PENDIENTE a VENCIDO si pasaron los días de gracia
    const cargosVencidos = await prisma.cargo.updateMany({
      where: {
        estado: EstadoCargo.PENDIENTE,
        fechaVencimiento: { lt: fechaLimiteVencimiento },
        saldoPendiente: { gt: 0 }
      },
      data: {
        estado: EstadoCargo.VENCIDO
      }
    });

    // 2. Actualizar cargos ABONADO a VENCIDO si pasaron los días de gracia
    const cargosAbonadosVencidos = await prisma.cargo.updateMany({
      where: {
        estado: EstadoCargo.ABONADO,
        fechaVencimiento: { lt: fechaLimiteVencimiento },
        saldoPendiente: { gt: 0 }
      },
      data: {
        estado: EstadoCargo.VENCIDO
      }
    });

    // 3. Actualizar CuentasPorCobrar relacionadas
    await prisma.cuentaPorCobrar.updateMany({
      where: {
        estado: { in: [EstadoCuenta.PENDIENTE, EstadoCuenta.ABONADA] },
        fechaVencimiento: { lt: fechaLimiteVencimiento },
        saldoPendiente: { gt: 0 }
      },
      data: {
        estado: EstadoCuenta.VENCIDA
      }
    });

    // 4. Contar cargos por estado
    const cargosPendientesCuenta = await prisma.cargo.count({
      where: {
        estado: EstadoCargo.PENDIENTE,
        saldoPendiente: { gt: 0 }
      }
    });

    const cargosVencidosCuenta = await prisma.cargo.count({
      where: {
        estado: EstadoCargo.VENCIDO,
        saldoPendiente: { gt: 0 }
      }
    });

    const cargosAbonadosCuenta = await prisma.cargo.count({
      where: {
        estado: EstadoCargo.ABONADO,
        saldoPendiente: { gt: 0 }
      }
    });

    const cargosSaldadosCuenta = await prisma.cargo.count({
      where: {
        estado: EstadoCargo.SALDO,
        saldoPendiente: { gt: 0 }
      }
    });

    return NextResponse.json({
      mensaje: "Estados de cargos actualizados correctamente",
      resumen: {
        actualizados: {
          pendienteAVencido: cargosVencidos.count,
          abonadoAVencido: cargosAbonadosVencidos.count
        },
        totales: {
          pendientes: cargosPendientesCuenta,
          vencidos: cargosVencidosCuenta,
          abonados: cargosAbonadosCuenta,
          saldados: cargosSaldadosCuenta
        },
        configuracion: {
          diasGracia,
          fechaLimiteVencimiento: fechaLimiteVencimiento.toISOString().split("T")[0],
          anioEscolar: tarifaActiva?.anioEscolar
        }
      }
    });
  } catch (error) {
    console.error("Error actualizando estados de cargos:", error);
    return NextResponse.json({ error: "Error al actualizar estados de cargos" }, { status: 500 });
  }
}
