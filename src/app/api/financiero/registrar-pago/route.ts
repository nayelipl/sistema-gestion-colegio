// Este es Cobro de Cargos a Tutores para registrar pagos de saldo pendiente de inscripción, colegiatura y transporte
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerSiguienteNumero } from "@/lib/contador-secuencial";
import { formatHoraLocal } from "@/lib/formatear-fecha";
import { ajustarFechasAPI } from "@/lib/ajustar-fechas";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rol = (session.user as any)?.role;
    const ROLES_PERMITIDOS = ["ADMINISTRADOR", "CONTADOR", "CAJERO", "TUTOR"];
    if (!ROLES_PERMITIDOS.includes(rol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    const body = await req.json();
    const { tutorId, pagos, metodoPago, subTotal, recargoTotal, descuento, total, concepto, origen } = body;

    // 🔍 LOG 1: Datos recibidos
    console.log("=== [registrar-pago] Datos recibidos ===");
    console.log("tutorId:", tutorId);
    console.log("metodoPago:", metodoPago);
    console.log("total:", total);
    console.log("concepto:", concepto);
    console.log("origen recibido:", origen);
    console.log("rol del usuario:", rol);
    console.log("email del usuario:", session.user?.email);
    console.log("======================================");

    // Si es tutor, que solo pueda pagar sus propios cargos
    if (rol === "TUTOR") {
      const email = session.user?.email;
      const tutor = await prisma.tutor.findUnique({
        where: { email: email! },
        select: { id: true }
      });
      
      if (!tutor || tutor.id !== body.tutorId) {
        return NextResponse.json({ error: "No autorizado para pagar esta cuenta" }, { status: 403 });
      }
    }

    if (!tutorId || !pagos || pagos.length === 0 || !metodoPago) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const pagosFormateados = pagos.map((pago: any) => {
      let montoPagado = Number(pago.montoPagado);
      
      if (isNaN(montoPagado)) {
        throw new Error(`Monto inválido para cargo ${pago.cargoId}`);
      }
      
      if (montoPagado < 0) {
        throw new Error(`El monto no puede ser negativo para cargo ${pago.cargoId}`);
      }
      
      montoPagado = Math.round(montoPagado * 100) / 100;
      
      return {
        cargoId: pago.cargoId,
        montoPagado: montoPagado
      };
    });

    const reciboNo = await obtenerSiguienteNumero("RI");
    
    const ahora = new Date();
    const hora = formatHoraLocal(ahora);

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear un solo recibo para todo el pago
      const recibo = await tx.reciboPago.create({
        data: {
          reciboNo,
          fecha: ahora,
          hora,
          tutorId,
          metodoPago,
          subTotal: Math.round(Number(subTotal) * 100) / 100,
          recargoTotal: Math.round(Number(recargoTotal) * 100) / 100,
          descuento: Math.round(Number(descuento) * 100) / 100,
          total: Math.round(Number(total) * 100) / 100,
          realizadoPor: session.user?.name || session.user?.email || "Sistema",
          concepto: concepto || "PAGO CARGOS",
          alPortador: "PAGO CARGOS",
          descripcion: `Pago de cargos - ${concepto}`,
          origen: origen || "PRESENCIAL",
        },
      });

      // 🔍 LOG 2: Recibo creado
      console.log("=== [registrar-pago] Recibo creado ===");
      console.log("reciboNo:", recibo.reciboNo);
      console.log("id:", recibo.id);
      console.log("origen guardado:", (recibo as any).origen);
      console.log("======================================");

      const ultimoMovimiento = await tx.movimientoContable.findFirst({
        where: { tutorId },
        orderBy: { id: "desc" },
      });
      
      let nuevoBalance = ultimoMovimiento?.balance?.toNumber() || 0;
      let montoTotalPagado = 0;

      // 2. Procesar cada cargo individual y actualizar estados
      for (const pago of pagosFormateados) {
        const { cargoId, montoPagado } = pago;
        
        const cargo = await tx.cargo.findUnique({
          where: { id: cargoId },
        });
        
        if (!cargo) {
          throw new Error(`Cargo ${cargoId} no encontrado`);
        }
        
        montoTotalPagado += montoPagado;
        
        const nuevoSaldoPendiente = cargo.saldoPendiente.toNumber() - montoPagado;
        const nuevoMontoPagado = (cargo.montoPagado?.toNumber() || 0) + montoPagado;
        
        let nuevoEstado = cargo.estado;
        if (nuevoSaldoPendiente <= 0) {
          nuevoEstado = "SALDO";
        } else if (nuevoSaldoPendiente < cargo.montoTotal.toNumber()) {
          nuevoEstado = "ABONADO";
        }
        
        await tx.cargo.update({
          where: { id: cargoId },
          data: {
            montoPagado: nuevoMontoPagado,
            saldoPendiente: nuevoSaldoPendiente,
            estado: nuevoEstado,
          },
        });
        
        await tx.pagoCargo.create({
          data: {
            reciboId: recibo.id,
            cargoId,
            montoPagado,
          },
        });
      }
      
      montoTotalPagado = Math.round(montoTotalPagado * 100) / 100;
      
      // 3. Calcular colegiatura y recargo
      let montoColegiatura = 0;
      let montoRecargo = 0;

      // Obtener porcentaje de recargo de la tarifa activa
      const tarifaActiva = await tx.tarifaAnioEscolar.findFirst({
        where: { activo: true },
        select: { recargoPorcentaje: true, colegiaturaDiasGracia: true }
      });

      const porcentajeRecargo = tarifaActiva?.recargoPorcentaje || 6;
      const diasGracia = tarifaActiva?.colegiaturaDiasGracia || 5;

      const fechaStr = new Date().toISOString().split('T')[0];
      const { fechaDesde: fechaAjustada } = ajustarFechasAPI(fechaStr, undefined);
      const hoy = fechaAjustada || new Date();
      hoy.setHours(0, 0, 0, 0);

      for (const pago of pagosFormateados) {
        const cargo = await tx.cargo.findUnique({
          where: { id: pago.cargoId },
        });

        if (cargo) {
          const fechaVenc = new Date(cargo.fechaVencimiento);
          fechaVenc.setHours(0, 0, 0, 0);
          
          const fechaLimite = new Date(fechaVenc);
          fechaLimite.setDate(fechaLimite.getDate() + diasGracia);
          
          const estaVencido = cargo.estado === "VENCIDO" || fechaVenc < fechaLimite;
          
          const montoOriginal = cargo.montoOriginal.toNumber();
          const saldoAntesDePago = cargo.saldoPendiente.toNumber();
          const montoPagado = pago.montoPagado;
          
          if (estaVencido && saldoAntesDePago > 0) {
            // El recargo se calcula sobre el saldo pendiente
            const recargoCalculado = (saldoAntesDePago * porcentajeRecargo) / 100;
            montoRecargo += recargoCalculado;
            montoColegiatura += saldoAntesDePago;
          } else {
            // No vencido, solo se cobra el saldo pendiente
            montoColegiatura += saldoAntesDePago;
          }
        }
      }

      console.log(`Total colegiatura: ${montoColegiatura}, Total recargo: ${montoRecargo}, Total pagado: ${montoTotalPagado}`);
      console.log(`Frontend envió - recargoTotal: ${recargoTotal}, colegiatura: ${subTotal}`);
      console.log(`Backend calculó - recargo: ${montoRecargo}, colegiatura: ${montoColegiatura}`);
      if (Math.abs(montoRecargo - (recargoTotal || 0)) > 0.01) {
        console.warn(`⚠️ Diferencia en recargo: frontend=${recargoTotal}, backend=${montoRecargo}`);
      }

      // 4. Movimiento contable
      // El balance se calcula: balance anterior - crédito + débito
      nuevoBalance = nuevoBalance - montoTotalPagado + montoRecargo;
      
      const movimientoNo = reciboNo;
      const descripcionMovimiento = concepto || "PAGO DE COLEGIATURA & TRANSPORTE";
      
      await tx.movimientoContable.create({
        data: {
          docNo: movimientoNo,
          fecha: ahora,
          hora,
          tipo: "PAGO",
          descripcion: descripcionMovimiento,
          debito: montoRecargo,
          credito: montoTotalPagado,
          balance: Math.round(nuevoBalance * 100) / 100,
          tutorId,
          realizadoPor: session.user?.name || session.user?.email || "Sistema",
          relacionId: recibo.id,
        },
      });
      
      return { reciboNo, movimientoNo, montoTotalPagado };
    });

    // 🔍 LOG 3: Respuesta
    console.log("=== [registrar-pago] Respuesta ===");
    console.log("reciboNo:", resultado.reciboNo);
    console.log("montoPagado:", resultado.montoTotalPagado);
    console.log("================================");
    
    return NextResponse.json({
      success: true,
      mensaje: "Pago registrado exitosamente",
      reciboNo: resultado.reciboNo,
      movimientoNo: resultado.movimientoNo,
      montoPagado: resultado.montoTotalPagado,
    });
    
  } catch (error) {
    console.error("Error registrando pago:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al registrar el pago" },
      { status: 500 }
    );
  }
}
