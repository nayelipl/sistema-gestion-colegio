import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ajustarFechasAPI } from "@/lib/ajustar-fechas";

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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { tarifaAnioId, tipo, cuotas } = body;

    console.log("=== POST configuracion-cuotas ===");
    console.log("tarifaAnioId:", tarifaAnioId, "tipo:", tipo);
    console.log("cuotas:", JSON.stringify(cuotas, null, 2));

    if (!tarifaAnioId || !cuotas || cuotas.length === 0) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const tipoValido = tipo || "COLEGIATURA";

    // Verificar duplicados en el array
    const numeros = cuotas.map((c: any) => c.numero);
    const numerosUnicos = new Set(numeros);
    if (numeros.length !== numerosUnicos.size) {
      console.error("DUPLICADOS EN EL ARRAY:", numeros);
      return NextResponse.json({ 
        error: "Números de cuota duplicados en la petición",
        detalles: numeros 
      }, { status: 400 });
    }

    // 1. Eliminar existentes
    const deleted = await prisma.configuracionCuota.deleteMany({
      where: {
        tarifaAnioId: tarifaAnioId,
        tipo: tipoValido,
      },
    });
    console.log(`Eliminados ${deleted.count} registros`);

    // 2. Insertar nuevos
    const datosCrear = cuotas.map((cuota: any) => {
      const fechaStr = `${cuota.anio}-${String(cuota.mes).padStart(2, '0')}-${String(cuota.dia).padStart(2, '0')}`;
      const { fechaDesde } = ajustarFechasAPI(fechaStr, undefined);
      const fechaVencimiento = fechaDesde || new Date(cuota.anio, cuota.mes - 1, cuota.dia);
      
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

    console.log("Intentando insertar:", datosCrear.map((d: any)=>`${d.numeroCuota}: ${d.anio}-${d.mes}-${d.diaVencimiento}`));

    const result = await prisma.configuracionCuota.createMany({
      data: datosCrear,
    });

    console.log(`Insertados ${result.count} registros`);

    return NextResponse.json({
      mensaje: `Configuración de ${tipoValido === "COLEGIATURA" ? "colegiatura" : "transporte"} guardada exitosamente`,
      cantidad: result.count,
    }, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/administracion/configuracion-cuotas:", error);
    // Enviar el error completo
    return NextResponse.json({ 
      error: "Error al guardar configuración",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
