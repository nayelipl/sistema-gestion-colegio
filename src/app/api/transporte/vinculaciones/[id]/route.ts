import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";
import { obtenerSiguienteNumero } from "@/lib/contador-secuencial";
import { TipoMovimiento, EstadoCuenta, EstadoCargo } from "@prisma/client";

// Actualizar estado del servicio de transporte
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permiso = await verificarPermiso(["ADMINISTRADOR", "CONTADOR", "CAJERO"]);
  if (permiso.error) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }

  try {
    const { id } = await params;
    const idNum = parseInt(id);
    const { estado, fechaCancelacion, motivo } = await req.json();

    const vinculacion = await prisma.transporteEstudiante.findUnique({
      where: { id: idNum },
      include: { estudiante: { include: { tutor: true } } },
    });

    if (!vinculacion) {
      return NextResponse.json({ error: "Vinculación no encontrada" }, { status: 404 });
    }

    const updateData: any = { estado };

    // Si se cancela, generar ajuste contable
    if (estado === "CANCELADO" && vinculacion.estado !== "CANCELADO") {
      const fechaCancel = fechaCancelacion ? new Date(fechaCancelacion) : new Date();
      updateData.fechaCancelacion = fechaCancel;

      // Cancelar cuentas por cobrar pendientes
      const cuentasPendientes = await prisma.cuentaPorCobrar.findMany({
        where: {
          tutorId: vinculacion.tutorId,
          tipo: "TRANSPORTE",
          estado: { in: ["PENDIENTE", "ABONADA"] },
          fechaVencimiento: { gte: fechaCancel },
        },
      });

      let totalCancelado = 0;
      for (const cuenta of cuentasPendientes) {
        totalCancelado += Number(cuenta.saldoPendiente);
        await prisma.cuentaPorCobrar.update({
          where: { id: cuenta.id },
          data: { estado: EstadoCuenta.SALDA, saldoPendiente: 0 },
        });
      }

      if (totalCancelado > 0) {
        const docAjuste = await obtenerSiguienteNumero("AJ");
        const horaActual = new Date().toLocaleTimeString("es-DO", { hour12: false });

        const ultimoMovimiento = await prisma.movimientoContable.findFirst({
          where: { tutorId: vinculacion.tutorId },
          orderBy: { fecha: "desc" },
        });
        let balanceActual = ultimoMovimiento?.balance ? Number(ultimoMovimiento.balance) : 0;
        balanceActual -= totalCancelado;

        await prisma.movimientoContable.create({
          data: {
            docNo: docAjuste,
            fecha: new Date(),
            hora: horaActual,
            tipo: TipoMovimiento.AJUSTE,
            descripcion: `AJUSTE POR CANCELACIÓN TRANSPORTE - ${vinculacion.estudiante?.apellido}, ${vinculacion.estudiante?.nombre}`,
            debito: 0,
            credito: totalCancelado,
            balance: balanceActual,
            tutorId: vinculacion.tutorId,
            estudianteId: vinculacion.estudianteId,
            realizadoPor: permiso.session?.user?.name || "SISTEMA",
          },
        });
      }
    }

    const updated = await prisma.transporteEstudiante.update({
      where: { id: idNum },
      data: updateData,
    });

    let mensaje = "";
    if (estado === "ACTIVO") mensaje = "Servicio reactivado";
    else if (estado === "SUSPENDIDO") mensaje = "Servicio suspendido";
    else mensaje = "Servicio cancelado";

    return NextResponse.json({ mensaje, vinculacion: updated });
  } catch (error) {
    console.error("Error PATCH:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permiso = await verificarPermiso(["ADMINISTRADOR", "CONTADOR", "CAJERO"]);
  if (permiso.error) {
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });
  }

  try {
    const { id } = await params;
    const idNum = parseInt(id);

    const vinculacion = await prisma.transporteEstudiante.findUnique({ where: { id: idNum } });
    if (!vinculacion) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    if (vinculacion.estado !== "CANCELADO") {
      return NextResponse.json({ error: "Solo se pueden eliminar cancelados" }, { status: 400 });
    }

    await prisma.transporteEstudiante.delete({ where: { id: idNum } });
    return NextResponse.json({ mensaje: "Vinculación eliminada" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
