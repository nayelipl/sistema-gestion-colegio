import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { EstadoCargo, EstadoCuenta } from "@prisma/client";
import { ajustarFechasAPI } from "@/lib/ajustar-fechas";

export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const tutorId = url.searchParams.get("tutorId");
    const estudianteId = url.searchParams.get("estudianteId");
    const tipo = url.searchParams.get("tipo");
    const cursoIds = url.searchParams.getAll("cursoIds").map(id => parseInt(id));
    const anioEscolarDesde = url.searchParams.get("anioEscolarDesde");
    const anioEscolarHasta = url.searchParams.get("anioEscolarHasta");

    // Obtener filtros de fecha
    const fechaDesde = url.searchParams.get("fechaDesde");
    const fechaHasta = url.searchParams.get("fechaHasta");

    const { fechaDesde: fechaInicio, fechaHasta: fechaFin } = ajustarFechasAPI(
      fechaDesde || undefined,
      fechaHasta || undefined
    );

    // Filtros para cargos
    const filtroCargos: any = {
      estado: { in: [EstadoCargo.PENDIENTE, EstadoCargo.VENCIDO, EstadoCargo.ABONADO] },
      saldoPendiente: { gt: 0 },
    };

    if (fechaInicio) {
      filtroCargos.fechaVencimiento = { gte: fechaInicio };
    }
    if (fechaFin) {
      filtroCargos.fechaVencimiento = {
        ...filtroCargos.fechaVencimiento,
        lte: fechaFin
      };
    }

    if (tutorId) {
      filtroCargos.tutorId = parseInt(tutorId);
    }

    if (estudianteId) {
      filtroCargos.estudianteId = parseInt(estudianteId);
    }

    if (tipo && tipo !== "TODOS") {
      filtroCargos.tipo = tipo;
    }

    // Filtro por cursos 
    if (cursoIds.length > 0) {
      const estudiantesEnCursos = await prisma.estudiante.findMany({
        where: {
          seccion: {
            cursoId: { in: cursoIds }
          }
        },
        select: { id: true }
      });
      
      const estudianteIds = estudiantesEnCursos.map(e => e.id);
      filtroCargos.estudianteId = { in: estudianteIds.length > 0 ? estudianteIds : [0] };
    }

    // Filtro por año escolar
    if (anioEscolarDesde) {
      filtroCargos.anioEscolar = { gte: anioEscolarDesde };
    }
    if (anioEscolarHasta) {
      filtroCargos.anioEscolar = { ...filtroCargos.anioEscolar, lte: anioEscolarHasta };
    }

    // Filtros para cuentas por cobrar
    const filtroCuentas: any = {
      estado: { in: [EstadoCuenta.PENDIENTE, EstadoCuenta.VENCIDA, EstadoCuenta.ABONADA] },
      saldoPendiente: { gt: 0 },
    };

    if (fechaInicio) {
      filtroCuentas.fechaVencimiento = { gte: fechaInicio };
    }
    if (fechaFin) {
      filtroCuentas.fechaVencimiento = {
        ...filtroCuentas.fechaVencimiento,
        lte: fechaFin
      };
    }

    if (tutorId) {
      filtroCuentas.tutorId = parseInt(tutorId);
    }

    if (tipo && tipo !== "TODOS") {
      filtroCuentas.tipo = tipo;
    }

    // Si es tutor, validar que solo vea sus cuentas
    if (rol === "TUTOR") {
      const email = session.user?.email;
      const tutor = await prisma.tutor.findUnique({
        where: { email: email! },
        select: { id: true }
      });
      
      if (!tutor) {
        return NextResponse.json({ error: "Tutor no encontrado" }, { status: 404 });
      }
      
      filtroCargos.tutorId = tutor.id;
      filtroCuentas.tutorId = tutor.id;
    }

    // Ejecutar consulta de cargos
    const cargos = await prisma.cargo.findMany({
      where: filtroCargos,
      include: {
        estudiante: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            apellido: true,
            seccion: {
              include: {
                curso: true
              }
            }
          }
        },
        tutor: {
          select: {
            id: true,
            cuentaNo: true,
            nombre: true,
            apellido: true,
          }
        },
        pagos: {  // Incluir los pagos relacionados
          include: {
            recibo: {  // Incluir el recibo para obtener la fecha
              select: {
                fecha: true,
                reciboNo: true,
                total: true,
              }
            }
          },
          orderBy: {
            recibo: {
              fecha: 'desc'  // Ordenar por fecha del recibo
            }
          },
          take: 1,  // Solo el último pago
        }
      },
      orderBy: { fechaVencimiento: "asc" },
    });

    const cargosConFechaPago = cargos.map(cargo => {
      // Obtener el último pago (ya ordenado)
      const ultimoPago = cargo.pagos[0];
      const fechaUltimoPago = ultimoPago?.recibo?.fecha || null;
      
      return {
        ...cargo,
        fechaUltimoPago: fechaUltimoPago,
        montoTotal: cargo.montoTotal.toString(),
        montoPagado: cargo.montoPagado?.toString() || "0",
        saldoPendiente: cargo.saldoPendiente.toString(),
      };
    });

    // Ejecutar consulta de cuentas por cobrar
    const cuentasPorCobrar = await prisma.cuentaPorCobrar.findMany({
      where: filtroCuentas,
      include: {
        tutor: {
          select: {
            id: true,
            cuentaNo: true,
            nombre: true,
            apellido: true,
          },
        },
      },
      orderBy: { fechaVencimiento: "asc" },
    });

    // Calcular totales
    const totalCargos = cargos.reduce((sum, c) => sum + c.saldoPendiente.toNumber(), 0);
    const totalCuentas = cuentasPorCobrar.reduce((sum, c) => sum + c.saldoPendiente.toNumber(), 0);

    return NextResponse.json({
      cargos: cargosConFechaPago,
      cuentasPorCobrar,
      totales: {
        cargos: totalCargos,
        cuentasPorCobrar: totalCuentas,
      },
    });
  } catch (error) {
    console.error("Error GET /api/financiero/cuentas-por-cobrar:", error);
    return NextResponse.json({ error: "Error al obtener cuentas por cobrar" }, { status: 500 });
  }
}
