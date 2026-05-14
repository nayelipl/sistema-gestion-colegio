import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rol = (session.user as any)?.role;
    if (!["ADMINISTRADOR", "CONTADOR", "CAJERO"].includes(rol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    const fondo = await prisma.cajaChicaFondo.findFirst({
      where: { estado: "ACTIVO" },
      orderBy: { creadoEn: "desc" }
    });

    const desembolsos = await prisma.cajaChica.findMany({
      where: { estado: "ACTIVA" },
      select: { monto: true }
    });
    
    const totalDesembolsos = desembolsos.reduce((sum, d) => sum + Number(d.monto), 0);
    const saldoInicial = fondo?.saldoInicial ? Number(fondo.saldoInicial) : 0;
    const saldoActual = saldoInicial - totalDesembolsos;
    const fondoMinimo = fondo?.fondoMinimo ? Number(fondo.fondoMinimo) : 0;

    return NextResponse.json({
      fondo: fondo ? {
        ...fondo,
        saldoInicial: Number(fondo.saldoInicial),
        fondoMinimo: Number(fondo.fondoMinimo),
      } : null,
      saldoActual,
      totalDesembolsos,
      fondoMinimo,
      requiereReposicion: saldoActual <= fondoMinimo
    });
  } catch (error) {
    console.error("Error GET fondo caja chica:", error);
    return NextResponse.json({ error: "Error al obtener fondo" }, { status: 500 });
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
    const { saldoInicial, fondoMinimo } = body;

    await prisma.cajaChicaFondo.updateMany({
      where: { estado: "ACTIVO" },
      data: { estado: "INACTIVO" }
    });

    const fondo = await prisma.cajaChicaFondo.create({
      data: {
        saldoInicial,
        fondoMinimo: fondoMinimo || 0,
        realizadoPor: session.user?.name || "Sistema",
        estado: "ACTIVO"
      }
    });

    return NextResponse.json({ 
      mensaje: "Fondo inicializado", 
      fondo: {
        ...fondo,
        saldoInicial: Number(fondo.saldoInicial),
        fondoMinimo: Number(fondo.fondoMinimo),
      }
    });
  } catch (error) {
    console.error("Error POST fondo caja chica:", error);
    return NextResponse.json({ error: "Error al inicializar fondo" }, { status: 500 });
  }
}
