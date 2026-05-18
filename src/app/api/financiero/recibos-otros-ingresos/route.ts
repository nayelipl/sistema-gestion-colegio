import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rol = (session.user as any)?.role;
    if (!["ADMINISTRADOR", "CONTADOR", "CAJERO", "TUTOR"].includes(rol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fechaDesde = searchParams.get("fechaDesde") || undefined;
    const fechaHasta = searchParams.get("fechaHasta") || undefined;
    const concepto = searchParams.get("concepto");
    const origen = searchParams.get("origen");
    let tutorIdParam = searchParams.get("tutorId");

    // 🔍 LOG 1: Parámetros recibidos
    console.log("=== [recibos-otros-ingresos] Parámetros ===");
    console.log("fechaDesde:", fechaDesde);
    console.log("fechaHasta:", fechaHasta);
    console.log("concepto:", concepto);
    console.log("origen recibido:", origen);
    console.log("tutorIdParam:", tutorIdParam);
    console.log("rol del usuario:", rol);
    console.log("email:", session.user?.email);
    console.log("==========================================");

    if (rol === "TUTOR") {
        const tutor = await prisma.tutor.findUnique({
            where: { email: session.user?.email! },
            select: { id: true }
        });

        // 🔍 LOG 2: Tutor encontrado
        console.log("=== [recibos-otros-ingresos] Tutor ===");
        console.log("tutor encontrado:", tutor);
        console.log("=====================================");

        if (tutor) {
            tutorIdParam = tutor.id.toString();
        } else {
            return NextResponse.json({ error: "Tutor no encontrado" }, { status: 404 });
        }

        // Los tutores deben ver todos sus recibos de pago en línea
        const where: any = {
          tutorId: parseInt(tutorIdParam),
          anulado: false,
          origen: "EN_LINEA",
        };

        // 🔍 LOG 3: Verificar si aplicamos filtro de origen
        console.log("=== [recibos-otros-ingresos] Filtros tutor ===");
        console.log("where antes de origen:", JSON.stringify(where, null, 2));

        // solo origen, raw
        where.origen = "EN_LINEA";
        
        // Todos
        // console.log("No filtrando por origen (tutor verá todos)");
        
        console.log("where después de origen:", JSON.stringify(where, null, 2));
        console.log("============================================");
        
        if (fechaDesde) {
          where.fecha = { ...where.fecha, gte: new Date(fechaDesde) };
        }
        if (fechaHasta) {
          where.fecha = { ...where.fecha, lte: new Date(fechaHasta) };
        }
        if (concepto && concepto !== "TODOS") {
          where.concepto = concepto;
        }
        
        const recibos = await prisma.reciboPago.findMany({
          where,
          include: {
            tutor: { select: { nombre: true, apellido: true, cuentaNo: true } },
            pagos: { 
              include: { cargo: true }
            }
          },
          orderBy: [{ fecha: "desc" }, { reciboNo: "desc" }]
        });

        // 🔍 LOG 4: Resultados
        console.log("=== [recibos-otros-ingresos] Resultados ===");
        console.log("Cantidad de recibos encontrados:", recibos.length);
        recibos.forEach(r => {
          console.log(`- ${r.reciboNo} | ${r.concepto} | origen: ${(r as any).origen} | total: ${r.total}`);
        });
        console.log("==========================================");
        
        const recibosFormateados = recibos.map((recibo) => ({
          id: recibo.id,
          reciboNo: recibo.reciboNo,
          fecha: recibo.fecha,
          hora: recibo.hora,
          metodoPago: recibo.metodoPago,
          total: recibo.total.toNumber(),
          realizadoPor: recibo.realizadoPor,
          anulado: recibo.anulado,
          anuladoPor: recibo.anuladoPor,
          motivoAnulacion: recibo.motivoAnulacion,
          tutor: recibo.tutor,
          concepto: recibo.concepto || "PAGO EN LÍNEA",
          alPortador: recibo.alPortador || "Pago en Línea",
          descripcion: recibo.descripcion || "",
          pagos: recibo.pagos.map(pago => ({
            cargoId: pago.cargoId,
            montoPagado: pago.montoPagado.toNumber(),
            cargo: pago.cargo ? {
              cargoNo: pago.cargo.cargoNo,
              tipo: pago.cargo.tipo,
            } : null
          }))
        }));
        
        return NextResponse.json({ recibos: recibosFormateados });
    }

    // Para Administrador, Contador y Cajero pueden filtrar por origen si lo especifican
    const where: any = {
      pagos: { none: {} }, // Solo recibos de otros ingresos, sin cargos asociados
    };

    if (tutorIdParam) {
      where.tutorId = parseInt(tutorIdParam);
    }
    if (fechaDesde) {
      where.fecha = { gte: new Date(fechaDesde) };
    }
    if (fechaHasta) {
      where.fecha = { ...where.fecha, lte: new Date(fechaHasta) };
    }
    if (concepto && concepto !== "TODOS") {
      where.concepto = concepto;
    }
    if (origen) {
      where.origen = origen;
    }

    const recibos = await prisma.reciboPago.findMany({
      where,
      include: {
        tutor: { select: { nombre: true, apellido: true, cuentaNo: true } }
      },
      orderBy: [{ fecha: "desc" }, { reciboNo: "desc" }]
    });

    const recibosFormateados = recibos.map((recibo) => ({
      id: recibo.id,
      reciboNo: recibo.reciboNo,
      fecha: recibo.fecha,
      hora: recibo.hora,
      metodoPago: recibo.metodoPago,
      total: recibo.total.toNumber(),
      realizadoPor: recibo.realizadoPor,
      anulado: recibo.anulado,
      anuladoPor: recibo.anuladoPor,
      motivoAnulacion: recibo.motivoAnulacion,
      tutor: recibo.tutor,
      concepto: recibo.concepto || "OTRO",
      alPortador: recibo.alPortador || "VARIOS",
      descripcion: recibo.descripcion || "",
    }));

    return NextResponse.json({ recibos: recibosFormateados });
  } catch (error) {
    console.error("Error GET recibos otros ingresos:", error);
    return NextResponse.json({ error: "Error al obtener recibos" }, { status: 500 });
  }
}
