import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { actualizarEstadosCargos } from "@/lib/actualizar-estados-cargos";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuarioRol = (session.user as any)?.role;
    if (!["ADMINISTRADOR", "CONTADOR", "CAJERO", "TUTOR"].includes(usuarioRol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tutorId = searchParams.get("tutorId");

    if (!tutorId) {
      return NextResponse.json({ error: "Se requiere tutorId" }, { status: 400 });
    }

    await actualizarEstadosCargos();

    const tarifaActiva = await prisma.tarifaAnioEscolar.findFirst({
      where: { activo: true },
      select: { recargoPorcentaje: true }
    });

    const porcentajeRecargo = tarifaActiva?.recargoPorcentaje || 6; // 6% por defecto

    // Obtener el tutor
    const tutor = await prisma.tutor.findUnique({
      where: { id: parseInt(tutorId) },
    });

    if (!tutor) {
      return NextResponse.json({ error: "Tutor no encontrado" }, { status: 404 });
    }

    // Obtener cargos del tutor
    const cargos = await prisma.cargo.findMany({
      where: {
        tutorId: parseInt(tutorId),
        estado: { in: ["PENDIENTE", "ABONADO", "VENCIDO"] },
        saldoPendiente: { gt: 0 }
      },
      include: {
        estudiante: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            codigo: true,
          },
        },
      },
      orderBy: { fechaVencimiento: "asc" },
    });

    // Calcular recargo para cada cargo si está vencido
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const cargosConRecargo = cargos.map(cargo => {
      const fechaVenc = new Date(cargo.fechaVencimiento);
      const estaVencido = cargo.estado === "VENCIDO" || fechaVenc < hoy;
      
      const saldoPendienteNum = cargo.saldoPendiente.toNumber();
      const montoOriginalNum = cargo.montoOriginal.toNumber();
      
      let recargoCalculado = 0;
      if (estaVencido && saldoPendienteNum > 0) {
        // Calcular recargo sobre el monto original
        recargoCalculado = (montoOriginalNum * porcentajeRecargo) / 100;
        // Redondear a 2 decimales
        recargoCalculado = Math.round(recargoCalculado * 100) / 100;
      }

      const montoTotalConRecargo = montoOriginalNum + recargoCalculado;
      
      return {
        id: cargo.id,
        cargoNo: cargo.cargoNo,
        tipo: cargo.tipo,
        fechaVencimiento: cargo.fechaVencimiento,
        monto: montoOriginalNum,
        recargo: recargoCalculado,
        montoTotal: montoTotalConRecargo,
        saldoPendiente: saldoPendienteNum,
        estudiante: cargo.estudiante,
      };
    });

    const balanceTotal = cargosConRecargo.reduce((sum, cargo) => sum + Number(cargo.saldoPendiente), 0);    

    return NextResponse.json({
      tutor: {
        id: tutor.id,
        cuentaNo: tutor.cuentaNo,
        nombre: tutor.nombre,
        apellido: tutor.apellido,
        direccion: tutor.direccion,
        celular: tutor.celular,
      },
      cargosPendientes: cargosConRecargo,
      balanceTotal,
      porcentajeRecargo,
    });
  } catch (error) {
    console.error("Error GET /api/financiero/cargos-pendientes:", error);
    return NextResponse.json({ error: "Error al obtener cargos pendientes" }, { status: 500 });
  }
}
