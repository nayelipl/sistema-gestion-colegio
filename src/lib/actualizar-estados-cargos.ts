import { prisma } from "./prisma";
import { EstadoCargo, EstadoCuenta } from "@prisma/client";

export async function actualizarEstadosCargos() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const tarifaActiva = await prisma.tarifaAnioEscolar.findFirst({
    where: { activo: true },
    select: { colegiaturaDiasGracia: true, anioEscolar: true }
  });

  const diasGracia = tarifaActiva?.colegiaturaDiasGracia || 0;
  
  const fechaLimiteVencimiento = new Date(hoy);
  fechaLimiteVencimiento.setDate(fechaLimiteVencimiento.getDate() - diasGracia);

  const cargosVencidos = await prisma.cargo.updateMany({
    where: {
      estado: EstadoCargo.PENDIENTE,
      fechaVencimiento: { lt: fechaLimiteVencimiento },
      saldoPendiente: { gt: 0 }
    },
    data: { estado: EstadoCargo.VENCIDO }
  });

  const cargosAbonadosVencidos = await prisma.cargo.updateMany({
    where: {
      estado: EstadoCargo.ABONADO,
      fechaVencimiento: { lt: fechaLimiteVencimiento },
      saldoPendiente: { gt: 0 }
    },
    data: { estado: EstadoCargo.VENCIDO }
  });

  await prisma.cuentaPorCobrar.updateMany({
    where: {
      estado: { in: [EstadoCuenta.PENDIENTE, EstadoCuenta.ABONADA] },
      fechaVencimiento: { lt: fechaLimiteVencimiento },
      saldoPendiente: { gt: 0 }
    },
    data: { estado: EstadoCuenta.VENCIDA }
  });

  return { cargosVencidos: cargosVencidos.count, cargosAbonadosVencidos: cargosAbonadosVencidos.count, fechaLimiteVencimiento, diasGracia };
}
