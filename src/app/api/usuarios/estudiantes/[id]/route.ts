import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";
import { EstadoCargo, EstadoCuenta, TipoMovimiento } from "@prisma/client";
import { obtenerSiguienteNumero } from "@/lib/contador-secuencial";
import { formatFechaLocal } from "@/lib/formatear-fecha";

// Para convertir Decimal a number
const toNumber = (valor: any): number => {
  if (!valor) return 0;
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'object' && 'toNumber' in valor) return valor.toNumber();
  return parseFloat(valor) || 0;
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { seccionId, nombre, apellido, ...resto } = body;
    const estudianteId = parseInt(id);
    
    if (isNaN(estudianteId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Obtener sección anterior (solo para validación)
    const estudianteActual = await prisma.estudiante.findUnique({
      where: { id: estudianteId },
      select: { seccionId: true }
    });

    // Solo actualizar datos básicos
    const estudiante = await prisma.estudiante.update({
      where: { id: estudianteId },
      data: { 
        seccionId: seccionId ? parseInt(seccionId) : undefined, 
        nombre, 
        apellido, 
        ...resto 
      }
    });

    return NextResponse.json({ estudiante });
  } catch (error) {
    console.error("Error PUT estudiante:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permiso = await verificarPermiso([
    "ADMINISTRADOR", "SECRETARIA_DOCENTE",
    "DIRECCION_ACADEMICA", "COORDINACION_ACADEMICA"
  ]);
  if (permiso.error) return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id } = await params;
    const estudianteId = parseInt(id);
    const data = await req.json();
    
    if (isNaN(estudianteId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    
    const updateData: any = {};
    if (data.seccionId !== undefined) updateData.seccionId = parseInt(data.seccionId);
    if (data.tutorId !== undefined) updateData.tutorId = parseInt(data.tutorId);
    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.apellido !== undefined) updateData.apellido = data.apellido;
    
    const estudiante = await prisma.estudiante.update({
      where: { id: estudianteId },
      data: updateData,
      include: { tutor: true, seccion: { include: { curso: true } } },
    });

    return NextResponse.json({ estudiante });
  } catch (error) {
    console.error("Error PATCH estudiante:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permiso = await verificarPermiso(["ADMINISTRADOR", "DIRECCION_ACADEMICA", "SECRETARIA_DOCENTE"]);
  if (permiso.error)
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    if (isNaN(id))
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const estudiante = await prisma.estudiante.findUnique({ 
      where: { id },
      include: { tutor: true }
    });
    
    if (!estudiante)
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });

    if (!estudiante.activo)
      return NextResponse.json({ error: "El estudiante ya está inactivo" }, { status: 400 });

    const fechaBaja = new Date();
    fechaBaja.setHours(0, 0, 0, 0);

    // Obtener cargos con fecha de vencimiento DESPUÉS de la fecha de baja (futuros)
    const cargosFuturos = await prisma.cargo.findMany({
      where: {
        estudianteId: id,
        fechaVencimiento: { gt: fechaBaja },
        saldoPendiente: { gt: 0 },
        estado: { in: [EstadoCargo.PENDIENTE, EstadoCargo.VENCIDO, EstadoCargo.ABONADO] }
      }
    });

    let totalCancelado = 0;

    // Cancelar cargos futuros
    for (const cargo of cargosFuturos) {
      const saldoPendiente = toNumber(cargo.saldoPendiente);
      totalCancelado += saldoPendiente;
      
      await prisma.cargo.update({
        where: { id: cargo.id },
        data: {
          estado: EstadoCargo.SALDO,
          montoPagado: cargo.montoTotal,
          saldoPendiente: 0
        }
      });

      await prisma.cuentaPorCobrar.updateMany({
        where: { cargoId: cargo.id },
        data: {
          estado: EstadoCuenta.SALDA,
          montoPagado: cargo.montoTotal,
          saldoPendiente: 0,
          fechaUltimoPago: fechaBaja
        }
      });
    }

    // Ajuste contable para cancelar cargos futuros
    if (totalCancelado > 0) {
      const ultimoMovimiento = await prisma.movimientoContable.findFirst({
        where: { tutorId: estudiante.tutorId },
        orderBy: { id: "desc" }
      });
      
      const balanceActual = ultimoMovimiento?.balance ? toNumber(ultimoMovimiento.balance) : 0;
      const nuevoBalance = Math.max(0, balanceActual - totalCancelado);
      
      const docAjuste = await obtenerSiguienteNumero("AJ-BAJA");
      const horaActual = formatFechaLocal(new Date());

      await prisma.movimientoContable.create({
        data: {
          docNo: docAjuste,
          fecha: fechaBaja,
          hora: horaActual,
          tipo: TipoMovimiento.AJUSTE,
          descripcion: `BAJA DE ESTUDIANTE: ${estudiante.codigo} - ${estudiante.nombre} ${estudiante.apellido}. Cancelación de ${cargosFuturos.length} cargos futuros.`,
          debito: 0,
          credito: totalCancelado,
          balance: nuevoBalance,
          tutorId: estudiante.tutorId,
          estudianteId: estudiante.id,
          realizadoPor: "SISTEMA",
          relacionId: estudiante.id
        }
      });
    }

    // Marcar matrícula actual como inactiva
    await prisma.matricula.updateMany({
      where: {
        estudianteId: id,
        activa: true
      },
      data: {
        activa: false,
        fechaBaja: fechaBaja,
        motivoBaja: "BAJA_VOLUNTARIA"
      }
    });

    // Si tiene sección asignada, liberar cupo
    if (estudiante.seccionId) {
      await prisma.seccion.update({
        where: { id: estudiante.seccionId },
        data: { inscritos: { decrement: 1 } }
      });
    }

    // Marcar estudiante como inactivo
    await prisma.estudiante.update({
      where: { id },
      data: { 
        activo: false,
        fechaBaja: fechaBaja,
        motivoBaja: "BAJA_VOLUNTARIA",
        seccionId: null
      }
    });

    // Desactivar usuario asociado
    await prisma.usuario.updateMany({
      where: {
        nombre: `${estudiante.nombre} ${estudiante.apellido}`,
        rol: "ESTUDIANTE",
        activo: true,
      },
      data: { activo: false },
    });

    return NextResponse.json({
      mensaje: `Estudiante ${estudiante.nombre} ${estudiante.apellido} dado de baja correctamente. Se cancelaron ${cargosFuturos.length} cargos futuros por RD$${totalCancelado.toFixed(2)}.`,
      data: {
        cargosCancelados: cargosFuturos.length,
        totalCancelado,
        fechaBaja
      }
    });
  } catch (error) {
    console.error("Error DELETE /api/usuarios/estudiantes/[id]:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
