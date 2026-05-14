import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerSiguienteNumero } from "@/lib/contador-secuencial";
import { ajustarFechasAPI } from "@/lib/ajustar-fechas";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rol = (session.user as any)?.role;
    if (!["ADMINISTRADOR", "CONTADOR", "CAJERO"].includes(rol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [cuadres, total] = await Promise.all([
      prisma.cajaChicaCuadre.findMany({
        skip,
        take: limit,
        orderBy: { creadoEn: "desc" }
      }),
      prisma.cajaChicaCuadre.count()
    ]);

    const cuadresFormateados = cuadres.map(c => ({
      ...c,
      saldoInicial: Number(c.saldoInicial),
      totalDesembolsos: Number(c.totalDesembolsos),
      saldoActual: Number(c.saldoActual),
      montoReposicion: Number(c.montoReposicion),
      desembolsos: typeof c.desembolsos === 'string' ? JSON.parse(c.desembolsos) : c.desembolsos
    }));

    return NextResponse.json({ cuadres: cuadresFormateados, totalPaginas: Math.ceil(total / limit), total });
  } catch (error) {
    console.error("Error GET cuadre caja chica:", error);
    return NextResponse.json({ error: "Error al obtener cuadres" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rol = (session.user as any)?.role;
    if (!["ADMINISTRADOR", "CONTADOR", "CAJERO"].includes(rol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    const body = await req.json();
    const { fechaDesde, fechaHasta, desembolsos, totalDesembolsos, saldoInicial, estado } = body;

    const { fechaDesde: fechaInicio, fechaHasta: fechaFin } = ajustarFechasAPI(fechaDesde, fechaHasta);

    const cuadreNo = await obtenerSiguienteNumero("CC");
    const saldoActual = saldoInicial - totalDesembolsos;
    const montoReposicion = saldoInicial - saldoActual;

    const cuadre = await prisma.cajaChicaCuadre.create({
      data: {
        cuadreNo,
        fecha: new Date(),
        fechaDesde: fechaInicio || new Date(),
        fechaHasta: fechaFin || new Date(),
        realizadoPor: session.user?.name || "Sistema",
        saldoInicial,
        totalDesembolsos,
        saldoActual,
        montoReposicion,
        estado,
        desembolsos: JSON.stringify(desembolsos),
        creadoPor: session.user?.name || "Usuario"
      }
    });

    return NextResponse.json({ 
      mensaje: "Cuadre guardado correctamente", 
      cuadre: {
        ...cuadre,
        saldoInicial: Number(cuadre.saldoInicial),
        totalDesembolsos: Number(cuadre.totalDesembolsos),
        saldoActual: Number(cuadre.saldoActual),
        montoReposicion: Number(cuadre.montoReposicion),
      }
    });
  } catch (error) {
    console.error("Error POST cuadre caja chica:", error);
    return NextResponse.json({ error: "Error al guardar cuadre" }, { status: 500 });
  }
}
