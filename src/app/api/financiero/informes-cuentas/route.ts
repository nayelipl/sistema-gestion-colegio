import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuarioId = parseInt((session.user as any).id);
    const rol = (session.user as any).role;

    const where: any = {};
    
    if (!["ADMINISTRADOR", "CONTADOR"].includes(rol)) {
      where.creadoPor = usuarioId;
    }

    const informes = await prisma.informeCuentaPorCobrar.findMany({
      where,
      orderBy: { creadoEn: "desc" },
      include: {
        creador: {
          select: { 
            nombre: true, 
            email: true,
          }
        }
      }
    });
    
    return NextResponse.json({ informes });
  } catch (error) {
    console.error("Error GET informes:", error);
    return NextResponse.json({ error: "Error al obtener informes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const {
      titulo,
      descripcion,
      fechaDesde,
      fechaHasta,
      tipo,
      cuotasVencidas,
      columnas,
      totalPendiente,
      totalCobrado,
      datos,
      anioEscolar,
    } = await req.json();

    const usuarioId = parseInt((session.user as any).id);
    
    if (isNaN(usuarioId)) {
      return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 });
    }

    if (!titulo || titulo.trim() === "") {
      return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
    }

    // Conversión de fechas de string a Date
    const fechaDesdeDate = fechaDesde ? new Date(fechaDesde) : null;
    const fechaHastaDate = fechaHasta ? new Date(fechaHasta) : null;

    // Validar que las fechas sean válidas
    if (fechaDesdeDate && isNaN(fechaDesdeDate.getTime())) {
      return NextResponse.json({ error: "Fecha desde inválida" }, { status: 400 });
    }
    if (fechaHastaDate && isNaN(fechaHastaDate.getTime())) {
      return NextResponse.json({ error: "Fecha hasta inválida" }, { status: 400 });
    }

    const informe = await prisma.informeCuentaPorCobrar.create({
      data: {
        titulo: titulo.trim(),
        descripcion: descripcion || null,
        fechaDesde: fechaDesdeDate,
        fechaHasta: fechaHastaDate,
        tipo: tipo || "TODOS",
        cuotasVencidas: cuotasVencidas ? parseInt(cuotasVencidas) : null,
        columnas: JSON.stringify(columnas || {}),
        totalPendiente: totalPendiente || 0,
        totalCobrado: totalCobrado || 0,
        datos: JSON.stringify(datos || []),
        creadoPor: usuarioId,
        anulado: false,
        anioEscolar: anioEscolar || null,
      },
    });

    return NextResponse.json({ informe }, { status: 201 });
  } catch (error) {
    console.error("Error POST informe:", error);
    return NextResponse.json({ error: "Error al guardar el informe" }, { status: 500 });
  }
}
