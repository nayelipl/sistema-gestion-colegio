import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ajustarFechasAPI } from "@/lib/ajustar-fechas";
import { EstadoCargo, EstadoCuenta } from "@prisma/client";
import { actualizarEstadosCargos } from "@/lib/actualizar-estados-cargos";

export async function GET(req: NextRequest) {
  try {
    console.log("=== [cuentas-por-cobrar] Inicio ===");
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuarioRol = (session.user as any)?.role;
    if (!["ADMINISTRADOR", "CONTADOR"].includes(usuarioRol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    // await actualizarEstadosCargos();
    console.log("Estados actualizados");

    const { searchParams } = new URL(req.url);
    const fechaDesde = searchParams.get("fechaDesde") || undefined;
    const fechaHasta = searchParams.get("fechaHasta") || undefined;
    const tipo = searchParams.get("tipo");
    const cuotasVencidas = searchParams.get("cuotasVencidas");
    const anioEscolar = searchParams.get("anioEscolar");
    const anioEscolarDesde = searchParams.get("anioEscolarDesde");
    const anioEscolarHasta = searchParams.get("anioEscolarHasta");
    const estudianteId = searchParams.get("estudianteId");
    const cursoId = searchParams.get("cursoId");
    const cursoIds = searchParams.getAll("cursoIds");

    console.log("Parámetros recibidos:", { tipo, cursoIds, anioEscolarDesde, anioEscolarHasta });

    const { fechaDesde: fechaInicio, fechaHasta: fechaFin } = ajustarFechasAPI(
      fechaDesde || undefined,
      fechaHasta || undefined
    );

    const whereCargo: any = {
      estado: { in: [EstadoCargo.PENDIENTE, EstadoCargo.VENCIDO, EstadoCargo.ABONADO] },
      saldoPendiente: { gt: 0 },
    };

    console.log("Where inicial:", JSON.stringify(whereCargo, null, 2));

    if (estudianteId && !isNaN(parseInt(estudianteId))) {
      whereCargo.estudianteId = parseInt(estudianteId);
    }

    if (fechaInicio) whereCargo.fechaVencimiento = { gte: fechaInicio };
    if (fechaFin) whereCargo.fechaVencimiento = { ...whereCargo.fechaVencimiento, lte: fechaFin };

    // Filtro de año escolar
    if (anioEscolarDesde && anioEscolarHasta) {
      whereCargo.anioEscolar = { gte: anioEscolarDesde, lte: anioEscolarHasta };
    } else if (anioEscolar && anioEscolar !== "TODOS") {
      whereCargo.anioEscolar = anioEscolar;
    }

    // Filtro de tipo y curso con lógica especial para inscripción
    if (tipo && tipo !== "TODOS") {
      whereCargo.tipo = tipo;
      
      // Las inscripciones no se filtran por curso porque son cargos generales del año escolar
      if (tipo !== "INSCRIPCION" && cursoIds.length > 0) {
        whereCargo.estudiante = {
          seccion: {
            cursoId: { in: cursoIds.map(id => parseInt(id)) }
          }
        };
      }
    } else if (cursoIds.length > 0) {
      // Para el tipo TODOS aplicar el filtro de curso
      whereCargo.estudiante = {
        seccion: {
          cursoId: { in: cursoIds.map(id => parseInt(id)) }
        }
      };
    }

    // Obtener todos los cargos con los filtros
    const cargos = await prisma.cargo.findMany({
      where: whereCargo,
      include: {
        estudiante: {
          select: { 
            nombre: true, 
            apellido: true, 
            codigo: true,
            seccion: {
              select: {
                id: true,
                codigo: true,
                curso: {
                  select: {
                    id: true,
                    codigo: true,
                    grado: true,
                    nivel: true,
                  }
                }
              }
            }
          }
        },
        tutor: {
          select: { cuentaNo: true, nombre: true, apellido: true }
        }
      },
      orderBy: [
        { tutorId: 'asc' },
        { estudianteId: 'asc' },
        { fechaVencimiento: 'asc' }
      ]
    });

    // Agrupar por tutor para calcular totales
    const tutorMap = new Map();
    for (const cargo of cargos) {
      if (!tutorMap.has(cargo.tutorId)) {
        tutorMap.set(cargo.tutorId, {
          tutorId: cargo.tutorId,
          cuenta: cargo.tutor.cuentaNo,
          tutor: `${cargo.tutor.nombre} ${cargo.tutor.apellido}`,
          cargos: [],
          totalMonto: 0,
          totalPagado: 0,
        });
      }
      
      const tutorData = tutorMap.get(cargo.tutorId);
      tutorData.cargos.push(cargo);
      tutorData.totalMonto += Number(cargo.montoTotal);
      tutorData.totalPagado += Number(cargo.montoPagado);
    }

    // Filtrar por cantidad de cuotas vencidas
    let resultados = Array.from(tutorMap.values());
    if (cuotasVencidas && parseInt(cuotasVencidas) > 0) {
      const minimoCuotas = parseInt(cuotasVencidas);
      resultados = resultados.filter(tutor => {
        const cargosVencidos = tutor.cargos.filter((cargo: any) => 
          cargo.estado === EstadoCargo.VENCIDO
        ).length;
        return cargosVencidos >= minimoCuotas;
      });
    }

    // Calcular totales generales
    const totalPendiente = resultados.reduce((sum, t) => sum + (Number(t.totalMonto) - Number(t.totalPagado)), 0);
    const totalCobrado = resultados.reduce((sum, t) => sum + Number(t.totalPagado), 0);

    console.log("=== [cuentas-por-cobrar] Fin exitoso ===");

    return NextResponse.json({
      cuentas: resultados,
      totalPendiente,
      totalCobrado,
      totalRegistros: resultados.length,
    });
  } catch (error) {
    console.error("Error GET /api/financiero/cuentas-por-cobrar:", error);
    return NextResponse.json({ error: "Error al obtener cuentas por cobrar" }, { status: 500 });
  }
}