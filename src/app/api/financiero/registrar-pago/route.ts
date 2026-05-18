// Este es Cobro de Cargos a Tutores para registrar pagos de saldo pendiente de inscripción, colegiatura y transporte
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerSiguienteNumero } from "@/lib/contador-secuencial";
import { formatFechaLocal, formatHoraLocal } from "@/lib/formatear-fecha";
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
    
    const { fechaDesde: ahora } = ajustarFechasAPI(formatFechaLocal(new Date()), undefined);
    const fechaActual = ahora || new Date();
    const horaActual = formatHoraLocal(fechaActual);

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear un solo recibo para todo el pago
      const recibo = await tx.reciboPago.create({
        data: {
          reciboNo,
          fecha: fechaActual,
          hora: horaActual,
          tutorId,
          metodoPago,
          subTotal: Math.round(Number(subTotal) * 100) / 100,
          recargoTotal: 0,
          descuento: Math.round(Number(descuento) * 100) / 100,
          total: Math.round(Number(total) * 100) / 100,
          realizadoPor: session.user?.name || session.user?.email || "Sistema",
          concepto: concepto || "PAGO CARGOS",
          alPortador: "PAGO CARGOS",
          descripcion: `Pago de cargos - ${concepto}`,
          origen: origen || "PRESENCIAL",
        },
      });

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
      
      // 3. Movimiento contable del pago, solo crédito
      nuevoBalance = nuevoBalance - montoTotalPagado;
      
      await tx.movimientoContable.create({
        data: {
          docNo: reciboNo,
          fecha: fechaActual,
          hora: horaActual,
          tipo: "PAGO",
          descripcion: concepto || "PAGO DE COLEGIATURA & TRANSPORTE",
          debito: 0,
          credito: montoTotalPagado,
          balance: Math.round(nuevoBalance * 100) / 100,
          tutorId,
          realizadoPor: session.user?.name || session.user?.email || "Sistema",
          relacionId: recibo.id,
        },
      });
      
      return { reciboNo, montoTotalPagado };
    });

    return NextResponse.json({
      success: true,
      mensaje: "Pago registrado exitosamente",
      reciboNo: resultado.reciboNo,
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
