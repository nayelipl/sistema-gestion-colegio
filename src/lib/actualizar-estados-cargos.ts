// Para calcular los recargos de cargos de incripción, colegiatura y transporte
import { prisma } from "./prisma";
import { EstadoCargo, EstadoCuenta, TipoMovimiento } from "@prisma/client";
import { obtenerSiguienteNumero } from "./contador-secuencial";
import { formatFechaLocal } from "./formatear-fecha";

export async function actualizarEstadosCargos() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const tarifaActiva = await prisma.tarifaAnioEscolar.findFirst({
    where: { activo: true },
    select: { 
      colegiaturaDiasGracia: true, 
      recargoPorcentaje: true, 
      anioEscolar: true
    }
  });

  const diasGracia = tarifaActiva?.colegiaturaDiasGracia || 0;
  const recargoPorcentaje = tarifaActiva?.recargoPorcentaje || 0;

  // Obtener todos los cargos no saldados (excluyendo recargos, solo cargos originales)
  const cargos = await prisma.cargo.findMany({
    where: {
      saldoPendiente: { gt: 0 },
      estado: { not: EstadoCargo.SALDO },
      tipo: { in: ["COLEGIATURA", "TRANSPORTE", "INSCRIPCION"] },
      estudiante: {
        activo: true
      }
    }
  });

  let resultado = {
    pendienteAVencido: 0,
    abonadoAVencido: 0,
    recargosAplicados: 0,
    totalRecargos: 0
  };

  for (const cargo of cargos) {
    const fechaVencimiento = new Date(cargo.fechaVencimiento);
    const fechaLimiteGracia = new Date(fechaVencimiento);
    fechaLimiteGracia.setDate(fechaVencimiento.getDate() + diasGracia);

    let nuevoEstadoCargo = cargo.estado;
    const saldoPendienteNum = cargo.saldoPendiente.toNumber();
    const montoOriginalNum = cargo.montoOriginal.toNumber();
    const recargoActual = cargo.recargo.toNumber();

    // Verificar si debe aplicar recargo
    if (hoy > fechaLimiteGracia && recargoActual === 0 && cargo.tipo !== "INSCRIPCION" && recargoPorcentaje > 0 && saldoPendienteNum > 0) {
      const montoRecargo = (montoOriginalNum * recargoPorcentaje) / 100;
      
      if (montoRecargo > 0) {
        resultado.totalRecargos += montoRecargo;
        resultado.recargosAplicados++;

        // Obtener último balance del tutor
        const ultimoMovimiento = await prisma.movimientoContable.findFirst({
          where: { tutorId: cargo.tutorId },
          orderBy: { id: "desc" }
        });
        
        const balanceActual = ultimoMovimiento?.balance?.toNumber() || 0;
        const nuevoBalance = balanceActual + montoRecargo;
        
        const docRecargo = await obtenerSiguienteNumero("RECARGO");
        const horaActual = formatFechaLocal(new Date());

        // Crear movimiento contable de débito por el recargo
        await prisma.movimientoContable.create({
          data: {
            docNo: docRecargo,
            fecha: new Date(),
            hora: horaActual,
            tipo: TipoMovimiento.CARGO,
            descripcion: `RECARGO por mora - ${cargo.cargoNo} (${recargoPorcentaje}%)`,
            debito: montoRecargo,
            credito: 0,
            balance: nuevoBalance,
            tutorId: cargo.tutorId,
            estudianteId: cargo.estudianteId,
            realizadoPor: "SISTEMA",
            relacionId: cargo.id
          }
        });

        // Actualizar el cargo original con el recargo
        await prisma.cargo.update({
          where: { id: cargo.id },
          data: { 
            recargo: montoRecargo,
            montoTotal: montoOriginalNum + montoRecargo,
            saldoPendiente: saldoPendienteNum + montoRecargo
          }
        });

        // Actualizar la cuenta por cobrar asociada
        await prisma.cuentaPorCobrar.updateMany({
          where: { cargoId: cargo.id },
          data: { 
            recargo: montoRecargo,
            montoTotal: montoOriginalNum + montoRecargo,
            saldoPendiente: saldoPendienteNum + montoRecargo
          }
        });
      }
    }

    // Determinar estado del cargo según fecha actual
    if (hoy > fechaLimiteGracia) {
      nuevoEstadoCargo = EstadoCargo.VENCIDO;
      if (cargo.estado === EstadoCargo.PENDIENTE) resultado.pendienteAVencido++;
      if (cargo.estado === EstadoCargo.ABONADO) resultado.abonadoAVencido++;
    }
    
    // Si está pagado parcialmente
    const montoPagadoNum = cargo.montoPagado?.toNumber() || 0;
    if (montoPagadoNum > 0 && cargo.saldoPendiente.toNumber() > 0) {
      nuevoEstadoCargo = EstadoCargo.ABONADO;
    }

    // Actualizar estado del cargo
    if (nuevoEstadoCargo !== cargo.estado) {
      await prisma.cargo.update({
        where: { id: cargo.id },
        data: { estado: nuevoEstadoCargo }
      });
    }

    // Determinar estado de la cuenta por cobrar
    let nuevoEstadoCuenta = null;
    if (hoy < fechaVencimiento) {
      nuevoEstadoCuenta = EstadoCuenta.CORRIENTE;
    } else if (hoy >= fechaVencimiento && hoy <= fechaLimiteGracia) {
      nuevoEstadoCuenta = EstadoCuenta.PENDIENTE;
    } else if (hoy > fechaLimiteGracia) {
      nuevoEstadoCuenta = EstadoCuenta.VENCIDA;
    }
    
    if (montoPagadoNum > 0 && cargo.saldoPendiente.toNumber() > 0) {
      nuevoEstadoCuenta = EstadoCuenta.ABONADA;
    }

    if (nuevoEstadoCuenta) {
      await prisma.cuentaPorCobrar.updateMany({
        where: { cargoId: cargo.id },
        data: { estado: nuevoEstadoCuenta }
      });
    }
  }

  return { 
    totalCargosProcesados: cargos.length,
    resultado,
    configuracion: {
      diasGracia,
      recargoPorcentaje,
      fechaActual: formatFechaLocal(hoy)
    }
  };
}