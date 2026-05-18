import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ajustarFechasAPI } from "@/lib/ajustar-fechas";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tutorId = searchParams.get("tutorId");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const tipo = searchParams.get("tipo");

    const usuarioRol = (session.user as any)?.role;
    const usuarioEmail = session.user?.email;

    let tutorIdFinal: number | null = null;

    // Caso 1: se especificó un tutorId en la URL (admin/contador/cajero viendo un tutor específico)
    if (tutorId) {
      tutorIdFinal = parseInt(tutorId);
      
      // Verificar permisos: solo admin, contador y cajero pueden ver cualquier tutor
      if (!["ADMINISTRADOR", "CONTADOR", "CAJERO"].includes(usuarioRol)) {
        return NextResponse.json({ error: "No tiene permisos para ver este estado de cuenta" }, { status: 403 });
      }
    } 
    // Caso 2: no se especificó tutorId, intentar obtener del usuario logueado
    else {
      // Buscar tutor por email
      const tutor = await prisma.tutor.findFirst({
        where: { email: usuarioEmail || "" }
      });
      
      if (tutor) {
        tutorIdFinal = tutor.id;
      } else {
        // Si no es tutor, puede ser admin/contador/cajero viendo su propio panel
        if (["ADMINISTRADOR", "CONTADOR", "CAJERO"].includes(usuarioRol)) {
          return NextResponse.json({
            tutor: null,
            movimientos: [],
            resumen: { totalDebito: 0, totalCredito: 0, balance: 0 },
            mensaje: "Seleccione un tutor para ver su estado de cuenta"
          });
        }
        return NextResponse.json({ error: "Tutor no encontrado" }, { status: 404 });
      }
    }

    const { fechaDesde: fechaInicio, fechaHasta: fechaFin } = ajustarFechasAPI(
      fechaDesde || undefined,
      fechaHasta || undefined
    );

    // Obtener IDs de recibos que son de otros ingresos, no tienen cargos asociados
    const recibosOtrosIngresos = await prisma.reciboPago.findMany({
      where: {
        tutorId: tutorIdFinal,
        pagos: { none: {} }, // No tiene pagos de cargos
        concepto: { in: ["EXCURSIÓN ESCOLAR", "OTRO", "DERECHO A GRADUACIÓN"] }
      },
      select: { id: true }
    });

    const idsRecibosExcluir = recibosOtrosIngresos.map(r => r.id);

    // Filtros
    const where: any = { tutorId: tutorIdFinal };

    // Excluir movimientos relacionados con otros ingresos
    if (idsRecibosExcluir.length > 0) {
      where.NOT = {
        relacionId: { in: idsRecibosExcluir }
      };
    }

    if (fechaInicio) {
      where.fecha = { gte: fechaInicio };
    }
    if (fechaFin) {
      where.fecha = { ...where.fecha, lte: fechaFin };
    }
    if (tipo && tipo !== "TODOS" && tipo !== "INSCRIPCION") {
      where.tipo = tipo;
    }

    // Obtener los movimientos contables
    let movimientos = await prisma.movimientoContable.findMany({
      where,
      include: {
        estudiante: { 
          select: { 
            nombre: true, 
            apellido: true,
            codigo: true,
          },
        },
      },
      orderBy: [{ fecha: "asc" }, { hora: "asc" }],
    });

    // Filtrar movimientos y recalcular totales
    const movimientosFiltrados = movimientos.filter(m => 
      !idsRecibosExcluir.includes(m.relacionId || 0)
    );

    const totalDebito = movimientosFiltrados.reduce((sum, m) => sum + Number(m.debito), 0);
    const totalCredito = movimientosFiltrados.reduce((sum, m) => sum + Number(m.credito), 0);
    const balanceFinal = movimientosFiltrados.length > 0 
      ? Number(movimientosFiltrados[movimientosFiltrados.length - 1].balance) 
      : 0;

    const tutor = await prisma.tutor.findUnique({
      where: { id: tutorIdFinal as number },
    });

    const movimientosFormateados = movimientos.map(m => ({
        ...m,
        debito: Number(m.debito),
        credito: Number(m.credito),
        balance: Number(m.balance),
    }));

    return NextResponse.json({
    tutor: tutor ? {
        id: tutor.id,
        cuentaNo: tutor.cuentaNo,
        nombre: tutor.nombre,
        apellido: tutor.apellido,
        direccion: tutor.direccion,
        celular: tutor.celular,
    } : null,
    movimientos: movimientosFormateados,
    resumen: {
        totalDebito: Number(totalDebito),
        totalCredito: Number(totalCredito),
        balance: Number(balanceFinal),
    },
    });
  } catch (error) {
    console.error("Error GET /api/financiero/estado-cuenta:", error);
    return NextResponse.json({ error: "Error al obtener estado de cuenta" }, { status: 500 });
  }
}
