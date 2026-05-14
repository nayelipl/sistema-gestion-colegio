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
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const estado = searchParams.get("estado");

    console.log("Parámetros recibidos:", { fechaDesde, fechaHasta, estado });

    const { fechaDesde: fechaInicio, fechaHasta: fechaFin } = ajustarFechasAPI(
      fechaDesde || undefined,
      fechaHasta || undefined
    );

    const where: any = {};
    if (fechaInicio) where.fecha = { gte: fechaInicio };
    if (fechaFin) where.fecha = { ...where.fecha, lte: fechaFin };
    if (estado && estado !== "TODOS") where.estado = estado;

    console.log("Where clause:", JSON.stringify(where, null, 2));

    const desembolsos = await prisma.cajaChica.findMany({
      where,
      orderBy: { fecha: "desc" }
    });

    const desembolsosFormateados = desembolsos.map(d => ({
      ...d,
      monto: Number(d.monto)
    }));

    const totalMonto = desembolsosFormateados.reduce((sum, d) => sum + d.monto, 0);

    return NextResponse.json({ desembolsos: desembolsosFormateados, totalMonto });
  } catch (error) {
    console.error("Error GET caja chica:", error);
    return NextResponse.json({ error: "Error al obtener desembolsos" }, { status: 500 });
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
    const { fecha, pagadoA, monto, conCargoA, porConceptoDe, aprobadoPor, recibidoPor, cedula } = body;

    if (!pagadoA || !monto || !conCargoA || !porConceptoDe || !aprobadoPor || !recibidoPor) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const fondo = await prisma.cajaChicaFondo.findFirst({
      where: { estado: "ACTIVO" },
      orderBy: { creadoEn: "desc" }
    });

    if (!fondo) {
      return NextResponse.json({ error: "No hay fondo activo. Inicialice el fondo primero." }, { status: 400 });
    }

    const desembolsosExistentes = await prisma.cajaChica.findMany({
      where: { estado: "ACTIVA" },
      select: { monto: true }
    });
    const totalDesembolsos = desembolsosExistentes.reduce((sum, d) => sum + Number(d.monto), 0);
    const saldoActual = Number(fondo.saldoInicial) - totalDesembolsos;

    if (saldoActual - monto < 0) {
      return NextResponse.json({ error: "Fondo insuficiente. Solicite reposición." }, { status: 400 });
    }

    const desembolsoNo = await obtenerSiguienteNumero("DC");

    const { fechaDesde: fechaAjustada } = ajustarFechasAPI(fecha, undefined);
    const fechaDesembolso = fechaAjustada || new Date();

    const desembolso = await prisma.cajaChica.create({
      data: {
        desembolsoNo,
        fecha: fechaDesembolso,
        pagadoA,
        monto,
        conCargoA,
        porConceptoDe,
        aprobadoPor,
        recibidoPor,
        cedula: cedula || null,
        creadoPor: session.user?.name || "Sistema",
        estado: "ACTIVA"
      }
    });

    const nuevoSaldoActual = saldoActual - monto;
    const requiereReposicion = nuevoSaldoActual <= Number(fondo.fondoMinimo);

    return NextResponse.json({ 
      mensaje: "Desembolso registrado", 
      desembolso: { ...desembolso, monto: Number(desembolso.monto) },
      requiereReposicion,
      saldoActual: nuevoSaldoActual
    });
  } catch (error) {
    console.error("Error POST caja chica:", error);
    return NextResponse.json({ error: "Error al registrar desembolso" }, { status: 500 });
  }
}
