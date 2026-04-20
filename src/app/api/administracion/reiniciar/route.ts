import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any)?.role !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que existen tarifas configuradas para el nuevo año
    const tarifaActiva = await prisma.tarifaAnioEscolar.findFirst({
      where: { activo: true },
      include: { tarifasCurso: true }
    });

    if (!tarifaActiva) {
      return NextResponse.json({ 
        error: "No hay tarifas configuradas para el nuevo año escolar. Configure las tarifas primero." 
      }, { status: 400 });
    }

    // Archivar calificaciones del año actual
    await prisma.calificacion.updateMany({
      where:  { estado: "PUBLICADA" },
      data:   { estado: "ARCHIVADA" },
    });

    // Remover secciones de estudiantes para nuevo año escolar
    await prisma.estudiante.updateMany({
      data: { seccionId: null },
    });

    // Aquí puedes agregar más acciones: ierre de cuentas por cobrar, crear secciones,
    // generar nuevas facturas con las nuevas tarifas, etc.

    return NextResponse.json({
      mensaje: "Año escolar reiniciado exitosamente. Las calificaciones fueron archivadas y los estudiantes están listos para ser matriculados en el nuevo ciclo.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al reiniciar el año escolar." }, { status: 500 });
  }
}
