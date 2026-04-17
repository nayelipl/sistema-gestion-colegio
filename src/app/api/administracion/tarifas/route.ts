import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tarifaActiva = await prisma.tarifaAnioEscolar.findFirst({
      where: { activo: true },
      include: {
        tarifasCurso: {
          include: { curso: true }
        },
      },
      orderBy: { creadoEn: "desc" }
    });

    const tarifasTransporte = await prisma.tarifaTransporte.findMany({
      where: { tarifaAnioId: tarifaActiva?.id || 0 }
    });

    return NextResponse.json({ tarifaActiva, tarifasTransporte });
  } catch (error) {
    console.error("Error GET /api/administracion/tarifas:", error);
    return NextResponse.json({ error: "Error al obtener tarifas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { anioEscolar, parametros, tarifasCurso, tarifasTransporte, actualizar } = body;

    if (!anioEscolar) {
      return NextResponse.json({ error: "El año escolar es obligatorio" }, { status: 400 });
    }

    // Verificar si ya existe una tarifa para este año
    const existe = await prisma.tarifaAnioEscolar.findUnique({
      where: { anioEscolar }
    });

    if (existe && !actualizar) {
      // Si existe y no se envió la bandera de actualizar, preguntar
      return NextResponse.json({ 
        error: `Ya existe una configuración para el año ${anioEscolar}. ¿Deseas actualizarla?`,
        requiereConfirmacion: true,
        anioEscolar
      }, { status: 409 });
    }

    if (existe && actualizar) {
      // ACTUALIZAR tarifa existente
      // Eliminar tarifas antiguas
      await prisma.tarifaCurso.deleteMany({ where: { tarifaAnioId: existe.id } });
      await prisma.tarifaTransporte.deleteMany({ where: { tarifaAnioId: existe.id } });
      
      // Actualizar la tarifa principal
      await prisma.tarifaAnioEscolar.update({
        where: { id: existe.id },
        data: {
          activo: true,
          valorInscripcion: parametros.valorInscripcion,
          recargoPorcentaje: parametros.recargoPorcentaje,
          colegiaturaNumCuotas: parametros.colegiaturaNumCuotas,
          colegiaturaDiaDesde: parametros.colegiaturaDiaDesde,
          colegiaturaDiaHasta: parametros.colegiaturaDiaHasta,
          colegiaturaDiasGracia: parametros.colegiaturaDiasGracia,
          transporteNumCuotas: parametros.transporteNumCuotas,
          transporteDiaDesde: parametros.transporteDiaDesde,
          transporteDiaHasta: parametros.transporteDiaHasta,
          transporteDiasGracia: parametros.transporteDiasGracia,
          tarifasCurso: {
            create: tarifasCurso.map((tc: any) => ({
              cursoId: tc.cursoId,
              cuotaColegiatura: tc.cuotaColegiatura,
              costoMateriales: tc.costoMateriales,
            })),
          },
        },
      });

      // Crear nuevas tarifas de transporte
      for (const tt of tarifasTransporte) {
        await prisma.tarifaTransporte.create({
          data: {
            tarifaAnioId: existe.id,
            tipo: tt.tipo,
            valorAnual: tt.valorAnual,
            inscripcion: tt.inscripcion,
          },
        });
      }

      return NextResponse.json({ 
        mensaje: `Tarifas para el año ${anioEscolar} actualizadas exitosamente.`,
        tarifaId: existe.id 
      }, { status: 200 });
    }

    // CREAR nueva tarifa
    // Desactivar la tarifa anterior si existe
    await prisma.tarifaAnioEscolar.updateMany({
      where: { activo: true },
      data: { activo: false }
    });

    const tarifa = await prisma.tarifaAnioEscolar.create({
      data: {
        anioEscolar,
        activo: true,
        valorInscripcion: parametros.valorInscripcion,
        recargoPorcentaje: parametros.recargoPorcentaje,
        colegiaturaNumCuotas: parametros.colegiaturaNumCuotas,
        colegiaturaDiaDesde: parametros.colegiaturaDiaDesde,
        colegiaturaDiaHasta: parametros.colegiaturaDiaHasta,
        colegiaturaDiasGracia: parametros.colegiaturaDiasGracia,
        transporteNumCuotas: parametros.transporteNumCuotas,
        transporteDiaDesde: parametros.transporteDiaDesde,
        transporteDiaHasta: parametros.transporteDiaHasta,
        transporteDiasGracia: parametros.transporteDiasGracia,
        tarifasCurso: {
          create: tarifasCurso.map((tc: any) => ({
            cursoId: tc.cursoId,
            cuotaColegiatura: tc.cuotaColegiatura,
            costoMateriales: tc.costoMateriales,
          })),
        },
      },
    });

    for (const tt of tarifasTransporte) {
      await prisma.tarifaTransporte.create({
        data: {
          tarifaAnioId: tarifa.id,
          tipo: tt.tipo,
          valorAnual: tt.valorAnual,
          inscripcion: tt.inscripcion,
        },
      });
    }

    return NextResponse.json({ 
      mensaje: `Tarifas para el año ${anioEscolar} guardadas exitosamente.`,
      tarifaId: tarifa.id 
    }, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/administracion/tarifas:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}