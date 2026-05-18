// Para la generación de recargos a cargos vencidos
import { prisma } from "./prisma";
import { EstadoCargo, EstadoCuenta } from "@prisma/client";

export async function actualizarEstadosCargos() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const tarifaActiva = await prisma.tarifaAnioEscolar.findFirst({
    where: { activo: true },
    select: { colegiaturaDiasGracia: true, recargoPorcentaje: true, anioEscolar: true }
  });

  const diasGracia = tarifaActiva?.colegiaturaDiasGracia || 0;
  const recargoPorcentaje = tarifaActiva?.recargoPorcentaje || 0;
  
  const fechaLimiteVencimiento = new Date(hoy);
  fechaLimiteVencimiento.setDate(fechaLimiteVencimiento.getDate() - diasGracia);

  // Buscar cargos vencidos que no tengan recargo generado
  const cargosVencidos = await prisma.cargo.findMany({
    where: {
      estado: EstadoCargo.PENDIENTE,
      fechaVencimiento: { lt: fechaLimiteVencimiento },
      saldoPendiente: { gt: 0 },
      // Solo cargos que no tengan recargo registrado
      recargo: 0,
    },
  });

  // Crear un cargo de recargo para cada cargo vencido
  for (const cargo of cargosVencidos) {
    const montoRecargo = (cargo.saldoPendiente.toNumber() * recargoPorcentaje) / 100;
    
    if (montoRecargo > 0) {
      // Crear un cargo separado para el recargo
      await prisma.cargo.create({
        data: {
          cargoNo: `REC-${cargo.cargoNo}`,
          estudianteId: cargo.estudianteId,
          tutorId: cargo.tutorId,
          tipo: "RECARGO",
          montoOriginal: montoRecargo,
          recargo: 0,
          montoTotal: montoRecargo,
          fechaVencimiento: cargo.fechaVencimiento,
          montoPagado: 0,
          saldoPendiente: montoRecargo,
          estado: EstadoCargo.PENDIENTE,
          anioEscolar: cargo.anioEscolar,
        },
      });

      // Actualizar el cargo original para marcar que tiene recargo
      await prisma.cargo.update({
        where: { id: cargo.id },
        data: { recargo: montoRecargo },
      });
    }
  }

  // Actualizar estados de cargos vencidos
  await prisma.cargo.updateMany({
    where: {
      estado: EstadoCargo.PENDIENTE,
      fechaVencimiento: { lt: fechaLimiteVencimiento },
      saldoPendiente: { gt: 0 }
    },
    data: { estado: EstadoCargo.VENCIDO }
  });

  // Actualizar cuentas por cobrar
  await prisma.cuentaPorCobrar.updateMany({
    where: {
      estado: { in: [EstadoCuenta.PENDIENTE, EstadoCuenta.ABONADA] },
      fechaVencimiento: { lt: fechaLimiteVencimiento },
      saldoPendiente: { gt: 0 }
    },
    data: { estado: EstadoCuenta.VENCIDA }
  });

  return { 
    cargosVencidos: cargosVencidos.length, 
    recargosGenerados: cargosVencidos.length,
    fechaLimiteVencimiento, 
    diasGracia 
  };
}