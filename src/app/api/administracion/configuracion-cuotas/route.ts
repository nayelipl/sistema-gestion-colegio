import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generarConfiguracionCuotas, type ConfiguracionCuota } from "@/lib/generar-cuotas";

// Obtener configuración de cuotas
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tarifaAnioId = searchParams.get("tarifaAnioId");
    const tipo = searchParams.get("tipo") || "COLEGIATURA";

    if (!tarifaAnioId) {
      return NextResponse.json({ error: "Se requiere tarifaAnioId" }, { status: 400 });
    }

    const configuraciones = await prisma.configuracionCuota.findMany({
      where: {
        tarifaAnioId: parseInt(tarifaAnioId),
        tipo: tipo,
      },
      orderBy: { numeroCuota: "asc" },
    });

    return NextResponse.json({ configuraciones });
  } catch (error) {
    console.error("Error GET /api/administracion/configuracion-cuotas:", error);
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

// Guardar configuración de cuotas
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { tarifaAnioId, tipo, cuotas } = await req.json();

    if (!tarifaAnioId || !cuotas || cuotas.length === 0) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const tipoValido = tipo || "COLEGIATURA";

    // Verificar que la tarifa existe
    const tarifa = await prisma.tarifaAnioEscolar.findUnique({
      where: { id: tarifaAnioId },
    });

    if (!tarifa) {
      return NextResponse.json({ error: "Tarifa no encontrada" }, { status: 404 });
    }

    // Eliminar configuraciones existentes
    await prisma.configuracionCuota.deleteMany({
      where: {
        tarifaAnioId: tarifaAnioId,
        tipo: tipoValido,
      },
    });

    // Crear nuevas configuraciones
    const datosCrear = cuotas.map((cuota : any) => {
      const fechaVencimiento = new Date(cuota.anio, cuota.mes - 1, cuota.dia);
      
      return {
        tarifaAnioId: tarifaAnioId,
        tipo: tipoValido,
        numeroCuota: cuota.numero,
        mes: cuota.mes,
        anio: cuota.anio,
        diaVencimiento: cuota.dia,
        fechaVencimiento: fechaVencimiento,
      };
    });

    const configuraciones = await prisma.configuracionCuota.createMany({
      data: datosCrear,
    });

    return NextResponse.json({
      mensaje: `Configuración de ${tipoValido === "COLEGIATURA" ? "colegiatura" : "transporte"} guardada exitosamente`,
      cantidad: configuraciones.count,
    }, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/administracion/configuracion-cuotas:", error);
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}

// Eliminar configuración de cuotas
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tarifaAnioId = searchParams.get("tarifaAnioId");
    const tipo = searchParams.get("tipo") || "COLEGIATURA";

    if (!tarifaAnioId) {
      return NextResponse.json({ error: "Se requiere tarifaAnioId" }, { status: 400 });
    }

    await prisma.configuracionCuota.deleteMany({
      where: {
        tarifaAnioId: parseInt(tarifaAnioId),
        tipo: tipo,
      },
    });

    return NextResponse.json({ mensaje: "Configuración eliminada" });
  } catch (error) {
    console.error("Error DELETE /api/administracion/configuracion-cuotas:", error);
    return NextResponse.json({ error: "Error al eliminar configuración" }, { status: 500 });
  }
}
