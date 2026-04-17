import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerSiguienteNumero } from "@/lib/contador-secuencial";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rol = (session.user as any)?.role;
    const ROLES_PERMITIDOS = ["ADMINISTRADOR", "CONTADOR", "CAJERO"];
    if (!ROLES_PERMITIDOS.includes(rol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    const body = await req.json();
    const { tutorId, pagos, metodoPago, subTotal, recargoTotal, descuento, total, concepto } = body;

    if (!tutorId || !pagos || pagos.length === 0 || !metodoPago) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const pagosFormateados = pagos.map((pago: any) => {
      // Validar y redondear el monto pagado a 2 decimales
      let montoPagado = Number(pago.montoPagado);
      
      // Verificar si es un número válido
      if (isNaN(montoPagado)) {
        throw new Error(`Monto inválido para cargo ${pago.cargoId}`);
      }
      
      // Verificar que no sea negativo
      if (montoPagado < 0) {
        throw new Error(`El monto no puede ser negativo para cargo ${pago.cargoId}`);
      }
      
      // Redondear a 2 decimales
      montoPagado = Math.round(montoPagado * 100) / 100;
      
      return {
        cargoId: pago.cargoId,
        montoPagado: montoPagado
      };
    });

    // Generar número de recibo único
    const reciboNo = await obtenerSiguienteNumero("RI");
    
    const ahora = new Date();
    const hora = ahora.toLocaleTimeString("es-ES", { hour12: false });
    const fechaStr = `${ahora.getFullYear()}${(ahora.getMonth() + 1).toString().padStart(2, "0")}${ahora.getDate().toString().padStart(2, "0")}`;

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear un solo recibo para todo el pago)
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
        },
      });

      // Obtener balance actual del tutor
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
        
        // Acumular monto total pagado
        montoTotalPagado += montoPagado;
        
        // Calcular nuevos valores
        const nuevoSaldoPendiente = cargo.saldoPendiente.toNumber() - montoPagado;
        const nuevoMontoPagado = (cargo.montoPagado?.toNumber() || 0) + montoPagado;
        
        let nuevoEstado = cargo.estado;
        if (nuevoSaldoPendiente <= 0) {
          nuevoEstado = "SALDA";
        } else if (nuevoSaldoPendiente < cargo.montoTotal.toNumber()) {
          nuevoEstado = "ABONADA";
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
      
      // Redondear el monto total pagado
      montoTotalPagado = Math.round(montoTotalPagado * 100) / 100;
      
      // 3. Un solo movimiento contable por el total pagado
      nuevoBalance -= montoTotalPagado;
      
      // Obtener el último secuencial de movimiento de pago para hoy
      const ultimoMovimientoPago = await tx.movimientoContable.findFirst({
        where: {
          docNo: { startsWith: `FP-${fechaStr}` }
        },
        orderBy: { docNo: "desc" }
      });
      
      let ultimoSecuencial = 0;
      if (ultimoMovimientoPago?.docNo) {
        const match = ultimoMovimientoPago.docNo.match(/FP-\d{8}-(\d+)/);
        if (match) {
          ultimoSecuencial = parseInt(match[1]);
        }
      }
      
      const nuevoSecuencial = ultimoSecuencial + 1;
      const movimientoNo = `FP-${fechaStr}-${nuevoSecuencial.toString().padStart(4, "0")}`;
      
      const descripcionMovimiento = concepto || "PAGO DE COLEGIATURA & TRANSPORTE";
      
      // Registrar un solo movimiento contable
      await tx.movimientoContable.create({
        data: {
          docNo: movimientoNo,
          fecha: ahora,
          hora,
          tipo: "PAGO",
          descripcion: descripcionMovimiento,
          debito: 0,
          credito: montoTotalPagado,
          balance: Math.round(nuevoBalance * 100) / 100,
          tutorId,
          realizadoPor: session.user?.name || session.user?.email || "Sistema",
          relacionId: recibo.id,
        },
      });
      
      return { reciboNo, movimientoNo, montoTotalPagado };
    });
    
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
