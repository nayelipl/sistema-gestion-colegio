import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TipoMovimiento } from "@prisma/client";

// Función para generar número de documento secuencial
async function generarDocNo(prefijo: string): Promise<string> {
  const lastMov = await prisma.movimientoContable.findFirst({
    where: { docNo: { startsWith: prefijo } },
    orderBy: { id: "desc" },
  });
  
  let num = 1;
  if (lastMov) {
    const lastNum = parseInt(lastMov.docNo.replace(`${prefijo}-`, ""));
    num = lastNum + 1;
  }
  return `${prefijo}-${num.toString().padStart(10, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const { estudianteId, tutorId, anioEscolar, incluirTransporte, tipoTransporte } = await req.json();

    // Obtener tarifas activas
    const tarifaActiva = await prisma.tarifaAnioEscolar.findFirst({
      where: { anioEscolar, activo: true },
      include: {
        tarifasCurso: {
          include: { curso: true }
        },
        tarifasTransporte: true,
      },
    });

    if (!tarifaActiva) {
      return NextResponse.json({ error: "No hay tarifas configuradas para este año escolar" }, { status: 400 });
    }

    const estudiante = await prisma.estudiante.findUnique({
      where: { id: estudianteId },
      include: { seccion: { include: { curso: true } } },
    });

    if (!estudiante) {
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
    }

    // Obtener tarifa del curso
    const tarifaCurso = tarifaActiva.tarifasCurso.find(
      tc => tc.cursoId === estudiante.seccion?.cursoId
    );

    const horaActual = new Date().toLocaleTimeString("es-DO", { hour12: false });
    const movimientos: any[] = [];
    let balance = 0;

    // 1. Cargo por inscripción (FA-INSC)
    const docInsc = await generarDocNo("FA-INSC");
    const valorInscripcion = Number(tarifaActiva.valorInscripcion);
    balance += valorInscripcion;
    
    movimientos.push({
      docNo: docInsc,
      fecha: new Date(),
      hora: horaActual,
      tipo: TipoMovimiento.CARGO,
      descripcion: `CARGO POR INSCRIPCIÓN DE ${estudiante.codigo} - ${estudiante.apellido}, ${estudiante.nombre}`,
      debito: valorInscripcion,
      credito: 0,
      balance: balance,
      tutorId: tutorId,
      estudianteId: estudianteId,
      realizadoPor: "SISTEMA",
    });

    // 2. Cuotas de colegiatura (FA-COLE)
    if (tarifaCurso) {
      const docCole = await generarDocNo("FA-COLE");
      const valorCuota = Number(tarifaCurso.cuotaColegiatura);
      const numCuotas = tarifaActiva.colegiaturaNumCuotas;
      const totalColegiatura = valorCuota * numCuotas;
      balance += totalColegiatura;

      movimientos.push({
        docNo: docCole,
        fecha: new Date(),
        hora: horaActual,
        tipo: TipoMovimiento.CARGO,
        descripcion: `FACTURACIÓN CUOTAS COLEGIATURA DE ${estudiante.codigo} - ${estudiante.apellido}, ${estudiante.nombre}`,
        debito: totalColegiatura,
        credito: 0,
        balance: balance,
        tutorId: tutorId,
        estudianteId: estudianteId,
        realizadoPor: "SISTEMA",
      });
    }

    // 3. Cuotas de transporte (si aplica)
    if (incluirTransporte) {
      const tarifaTransporte = tarifaActiva.tarifasTransporte.find(tt => tt.tipo === tipoTransporte);
      if (tarifaTransporte) {
        const docTrans = await generarDocNo("FA-TRAN");
        const valorTransporte = Number(tarifaTransporte.valorAnual);
        balance += valorTransporte;

        let descripcionTransporte = "";
        if (tipoTransporte === "COMPLETO") descripcionTransporte = "TRANSPORTE COMPLETO";
        else if (tipoTransporte === "MEDIO (RECOGER)") descripcionTransporte = "1/2 TRANSPORTE (BUSCAR)";
        else descripcionTransporte = "1/2 TRANSPORTE (LLEVAR)";

        movimientos.push({
          docNo: docTrans,
          fecha: new Date(),
          hora: horaActual,
          tipo: TipoMovimiento.CARGO,
          descripcion: `FACTURACIÓN ${descripcionTransporte} DE ${estudiante.codigo} - ${estudiante.apellido}, ${estudiante.nombre}`,
          debito: valorTransporte,
          credito: 0,
          balance: balance,
          tutorId: tutorId,
          estudianteId: estudianteId,
          realizadoPor: "SISTEMA",
        });
      }
    }

    // Guardar todos los movimientos
    await prisma.movimientoContable.createMany({
      data: movimientos,
    });

    return NextResponse.json({
      mensaje: "Cuotas generadas exitosamente",
      movimientos,
      total: balance,
    }, { status: 201 });
  } catch (error) {
    console.error("Error generando cuotas:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
