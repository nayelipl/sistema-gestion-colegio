import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { actualizarEstadosCargos } from "@/lib/actualizar-estados-cargos";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuarioRol = (session.user as any)?.role;
    if (!["ADMINISTRADOR", "CONTADOR", "CAJERO", "TUTOR"].includes(usuarioRol)) {
    return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tutorId = searchParams.get("tutorId");

    if (!tutorId) {
      return NextResponse.json({ error: "Se requiere tutorId" }, { status: 400 });
    }

    await actualizarEstadosCargos();

    // Obtener todos los estudiantes del tutor
    const estudiantes = await prisma.estudiante.findMany({
      where: {
        tutorId: parseInt(tutorId),
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        apellido: true,
        cargos: {
          where: { saldoPendiente: { gt: 0 } },
          select: { tipo: true, saldoPendiente: true }
        }
      },
      orderBy: { nombre: "asc" }
    });

    const estudiantesConInfo = estudiantes.map(est => ({
      id: est.id,
      codigo: est.codigo,
      nombre: est.nombre,
      apellido: est.apellido,
      tieneDeuda: est.cargos.length > 0,
      tieneTransporte: est.cargos.some(c => c.tipo === "TRANSPORTE"),
      montoDeuda: est.cargos.reduce((sum, c) => sum + Number(c.saldoPendiente), 0)
    }));

    return NextResponse.json({ estudiantes: estudiantesConInfo });
  } catch (error) {
    console.error("Error GET estudiantes con cargos:", error);
    return NextResponse.json({ error: "Error al obtener estudiantes" }, { status: 500 });
  }
}
