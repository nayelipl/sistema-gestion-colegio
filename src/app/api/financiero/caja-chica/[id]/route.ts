import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rol = (session.user as any)?.role;
    if (!["ADMINISTRADOR", "CONTADOR", "CAJERO"].includes(rol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    const { anulado, motivoAnulacion } = body;

    const desembolso = await prisma.cajaChica.update({
      where: { id },
      data: {
        estado: anulado ? "ANULADA" : "ACTIVA",
        anuladoPor: anulado ? session.user?.name : null,
        anuladoEn: anulado ? new Date() : null,
        motivoAnulacion: anulado ? motivoAnulacion : null
      }
    });

    return NextResponse.json({ 
      mensaje: "Desembolso actualizado", 
      desembolso: { ...desembolso, monto: Number(desembolso.monto) } 
    });
  } catch (error) {
    console.error("Error PUT caja chica:", error);
    return NextResponse.json({ error: "Error al actualizar desembolso" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const desembolso = await prisma.cajaChica.findUnique({ where: { id } });

    if (!desembolso) {
      return NextResponse.json({ error: "Desembolso no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ desembolso: { ...desembolso, monto: Number(desembolso.monto) } });
  } catch (error) {
    console.error("Error GET caja chica:", error);
    return NextResponse.json({ error: "Error al obtener desembolso" }, { status: 500 });
  }
}
