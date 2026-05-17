// Ajustar balance por nota de crédito para cancelar cargos del transporte
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";
import { EstadoCargo, EstadoCuenta, TipoMovimiento } from "@prisma/client";
import { ajustarFechasAPI } from "@/lib/ajustar-fechas";
import { obtenerSiguienteNumero } from "@/lib/contador-secuencial";
import { formatHoraLocal } from "@/lib/formatear-fecha";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(["ADMINISTRADOR", "CONTADOR", "CAJERO"]);
  if (permiso.error) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { estado, fechaCancelacion } = body;

    const transporteId = parseInt(id);

    const transporte = await prisma.transporteEstudiante.findUnique({
      where: { id: transporteId },
      include: { estudiante: { include: { tutor: true } } }
    });

    if (!transporte) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    const ahora = new Date();
    const horaActual = formatHoraLocal(ahora);
    let fechaAfectacion = ahora;

    if (estado === "CANCELADO" && fechaCancelacion) {
      const { fechaDesde } = ajustarFechasAPI(fechaCancelacion, undefined);
      fechaAfectacion = fechaDesde || new Date(fechaCancelacion);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Actualizar estado del servicio
      await tx.transporteEstudiante.update({
        where: { id: transporteId },
        data: {
          estado,
          fechaCancelacion: estado === "CANCELADO" ? fechaAfectacion : null,
          actualizadoEn: ahora,
        },
      });

      if (estado === "CANCELADO") {
        // 2. Buscar cargos futuros que serán cancelados
        const cargosACancelar = await tx.cargo.findMany({
          where: {
            estudianteId: transporte.estudianteId,
            tipo: "TRANSPORTE",
            estado: { in: ["PENDIENTE", "ABONADO", "VENCIDO"] },
            fechaVencimiento: { gte: fechaAfectacion },
          },
        });

        let totalCancelado = 0;

        for (const cargo of cargosACancelar) {
          const saldoPendiente = cargo.saldoPendiente.toNumber();
          totalCancelado += saldoPendiente;

          // Obtener el último balance del tutor
          const ultimoMovimiento = await tx.movimientoContable.findFirst({
            where: { tutorId: transporte.tutorId },
            orderBy: { id: "desc" },
          });
          let nuevoBalance = ultimoMovimiento?.balance?.toNumber() || 0;

          // Crear una Nota de Crédito (ajuste negativo) para cancelar el cargo
          const docNo = await obtenerSiguienteNumero("NC");
          
          // La nota de crédito disminuye el balance (crédito positivo o débito negativo)
          nuevoBalance -= saldoPendiente;

          await tx.movimientoContable.create({
            data: {
              docNo,
              fecha: ahora,
              hora: horaActual,
              tipo: TipoMovimiento.AJUSTE,
              descripcion: `NOTA DE CRÉDITO - CANCELACIÓN SERVICIO TRANSPORTE - ${cargo.cargoNo}`,
              debito: 0,
              credito: saldoPendiente, // Crédito disminuye el balance
              balance: nuevoBalance,
              tutorId: transporte.tutorId,
              estudianteId: transporte.estudianteId,
              realizadoPor: permiso.session?.user?.name || "SISTEMA",
            },
          });

          // Marcar el cargo como SALDO (porque fue cancelado mediante nota de crédito)
          await tx.cargo.update({
            where: { id: cargo.id },
            data: {
              estado: EstadoCargo.SALDO,
              saldoPendiente: 0,
            },
          });

          // Marcar la cuenta por cobrar como SALDA
          await tx.cuentaPorCobrar.updateMany({
            where: { cargoId: cargo.id },
            data: {
              estado: EstadoCuenta.SALDA,
              saldoPendiente: 0,
            },
          });
        }
      }
    });

    let mensaje = "";
    if (estado === "CANCELADO") {
      mensaje = `Servicio cancelado. Se ha generado una nota de crédito por las cuotas posteriores a ${fechaAfectacion.toLocaleDateString()}.`;
    } else if (estado === "ACTIVO") {
      mensaje = "Servicio reactivado. Para generar nuevas cuotas, debe vincular nuevamente el servicio.";
    } else {
      mensaje = `Servicio ${estado === "SUSPENDIDO" ? "suspendido" : "actualizado"}`;
    }

    return NextResponse.json({ mensaje });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error al actualizar el servicio" }, { status: 500 });
  }
}
