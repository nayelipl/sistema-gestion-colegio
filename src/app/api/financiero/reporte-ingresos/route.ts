import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerSiguienteNumero } from "@/lib/contador-secuencial";

type ResumenConcepto = {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  cheque: number;
  total: number;
};

type ResumenPorOrigen = {
  presencial: {
    inscripcion: ResumenConcepto;
    colegiatura: ResumenConcepto;
    transporte: ResumenConcepto;
    uniforme: ResumenConcepto;
    derechoGraduacion: ResumenConcepto;
    excursionEscolar: ResumenConcepto;
    otrosIngresos: ResumenConcepto;
  };
  enLinea: {
    inscripcion: ResumenConcepto;
    colegiatura: ResumenConcepto;
    transporte: ResumenConcepto;
    derechoGraduacion: ResumenConcepto;
    excursionEscolar: ResumenConcepto;
  };
};

const crearConceptoVacio = (): ResumenConcepto => ({
  efectivo: 0, tarjeta: 0, transferencia: 0, cheque: 0, total: 0
});

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

    const [reportes, total] = await Promise.all([
      prisma.reporteIngreso.findMany({
        skip,
        take: limit,
        orderBy: { creadoEn: "desc" }
      }),
      prisma.reporteIngreso.count()
    ]);

    const reportesFormateados = reportes.map(r => {
      const datos = JSON.parse(r.datos as string);
      
      // Asegurar compatibilidad con datos antiguos
      if (datos.resumen && !datos.resumen.presencial) {
        const viejoResumen = datos.resumen;
        datos.resumen = {
          presencial: viejoResumen,
          enLinea: {
            inscripcion: crearConceptoVacio(),
            colegiatura: crearConceptoVacio(),
            transporte: crearConceptoVacio(),
            derechoGraduacion: crearConceptoVacio(),
            excursionEscolar: crearConceptoVacio(),
          }
        };
      }

      return {
        ...r,
        totalMonto: typeof r.totalMonto === 'number' ? r.totalMonto : r.totalMonto.toNumber(),
        saldoInicial: typeof r.saldoInicial === 'number' ? r.saldoInicial : r.saldoInicial.toNumber(),
        saldoFinal: typeof r.saldoFinal === 'number' ? r.saldoFinal : r.saldoFinal.toNumber(),
        datos
      };
    });

    return NextResponse.json({ 
      reportes: reportesFormateados, 
      totalPaginas: Math.ceil(total / limit), 
      total 
    });
    
  } catch (error) {
    console.error("Error GET reporte ingresos:", error);
    return NextResponse.json({ error: "Error al obtener reportes" }, { status: 500 });
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
    const { fechaDesde, fechaHasta, realizadoPor, recibos, totalRecibos, totalMonto, saldoInicial, saldoFinal, denominaciones = [], estado } = body;

    if (estado === "REPORTADO") {
      const borradorPendiente = await prisma.reporteIngreso.findFirst({
        where: { estado: "BORRADOR" }
      });
      if (borradorPendiente) {
        return NextResponse.json({ 
          error: "Hay un borrador pendiente. Complete o elimine el borrador antes de crear un nuevo reporte." 
        }, { status: 409 });
      }
    }

    // Generar número de reporte
    const reporteNo = await obtenerSiguienteNumero("REP");

    // Inicializar resumen por concepto y método de pago
    const resumen: ResumenPorOrigen = {
      presencial: {
        inscripcion: crearConceptoVacio(),
        colegiatura: crearConceptoVacio(),
        transporte: crearConceptoVacio(),
        uniforme: crearConceptoVacio(),
        derechoGraduacion: crearConceptoVacio(),
        excursionEscolar: crearConceptoVacio(),
        otrosIngresos: crearConceptoVacio(),
      },
      enLinea: {
        inscripcion: crearConceptoVacio(),
        colegiatura: crearConceptoVacio(),
        transporte: crearConceptoVacio(),
        derechoGraduacion: crearConceptoVacio(),
        excursionEscolar: crearConceptoVacio(),
      }
    };

    // Procesar cada recibo
    for (const recibo of recibos) {
      const origen = recibo.origen || "PRESENCIAL";
      
      // Si el recibo tiene pagos asociados (cargos)
      if (recibo.pagos && recibo.pagos.length > 0) {
        // Procesar cada pago individualmente
        for (const pago of recibo.pagos) {
          const metodo = recibo.metodoPago?.toLowerCase() || "";
          const monto = pago.montoPagado;
          const cargo = pago.cargo;
          
          if (!cargo) continue;
          
          // Determinar la categoría según el tipo de cargo
          let categoria = "";
          if (cargo.tipo === "INSCRIPCION") {
            categoria = "inscripcion";
          } else if (cargo.tipo === "COLEGIATURA") {
            categoria = "colegiatura";
          } else if (cargo.tipo === "TRANSPORTE") {
            categoria = "transporte";
          } else {
            categoria = "otrosIngresos";
          }
          
          // Sumar según su origen
          if (origen === "EN_LINEA") {
            if (["inscripcion", "colegiatura", "transporte", "derechoGraduacion", "excursionEscolar"].includes(categoria)) {
              const target = resumen.enLinea[categoria as keyof typeof resumen.enLinea];
              if (metodo === "tarjeta") target.tarjeta += monto;
              target.total += monto;
            }
          } else {
            const target = resumen.presencial[categoria as keyof typeof resumen.presencial];
            if (metodo === "efectivo") target.efectivo += monto;
            else if (metodo === "tarjeta") target.tarjeta += monto;
            else if (metodo === "transferencia") target.transferencia += monto;
            else if (metodo === "cheque") target.cheque += monto;
            target.total += monto;
          }
        }
      } 
      // Si no tiene pagos, es un ingreso directo: OTRO, EXCURSIÓN ESCOLAR o DERECHO A GRADUACIÓN
      else {
        const metodo = recibo.metodoPago?.toLowerCase() || "";
        const monto = recibo.total;
        
        let categoria = "";
        if (recibo.concepto === "DERECHO A GRADUACIÓN") {
          categoria = "derechoGraduacion";
        } else if (recibo.concepto === "EXCURSIÓN ESCOLAR") {
          categoria = "excursionEscolar";
        } else if (recibo.concepto === "UNIFORME") {
          categoria = "uniforme";
        } else {
          categoria = "otrosIngresos";
        }
        
        // Sumar según su origen
        if (origen === "EN_LINEA") {
          if (["derechoGraduacion", "excursionEscolar"].includes(categoria)) {
            const target = resumen.enLinea[categoria as keyof typeof resumen.enLinea];
            if (metodo === "tarjeta") target.tarjeta += monto;
            target.total += monto;
          }
        } else {
          const target = resumen.presencial[categoria as keyof typeof resumen.presencial];
          if (metodo === "efectivo") target.efectivo += monto;
          else if (metodo === "tarjeta") target.tarjeta += monto;
          else if (metodo === "transferencia") target.transferencia += monto;
          else if (metodo === "cheque") target.cheque += monto;
          target.total += monto;
        }
      }
    }

    const reporte = await prisma.reporteIngreso.create({
      data: {
        reporteNo,
        fecha: new Date(),
        fechaDesde: new Date(fechaDesde),
        fechaHasta: new Date(fechaHasta),
        realizadoPor: realizadoPor || null,
        totalRecibos,
        totalMonto,
        saldoInicial,
        saldoFinal,
        estado,
        datos: JSON.stringify({ 
          recibos, 
          resumen,
          denominaciones 
        }),
        creadoPor: session.user?.name || "Usuario",
      }
    });

    return NextResponse.json({ mensaje: "Reporte guardado correctamente", reporte });
  } catch (error) {
    console.error("Error POST reporte ingresos:", error);
    return NextResponse.json({ error: "Error al guardar el reporte" }, { status: 500 });
  }
}
