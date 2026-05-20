import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { actualizarEstadosCargos } from "@/lib/actualizar-estados-cargos";

// Para obtiener los cargos con recargos
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

    // Actualizar estados y recargos antes de mostrar
    await actualizarEstadosCargos();

    // Obtener el tutor
    const tutor = await prisma.tutor.findUnique({
      where: { id: parseInt(tutorId) },
    });

    if (!tutor) {
      return NextResponse.json({ error: "Tutor no encontrado" }, { status: 404 });
    }

    // Obtener cargos del tutor
    const cargos = await prisma.cargo.findMany({
      where: {
        tutorId: parseInt(tutorId),
        estado: { in: ["PENDIENTE", "ABONADO", "VENCIDO"] },
        saldoPendiente: { gt: 0 }
      },
      include: {
        estudiante: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            codigo: true,
          },
        },
      },
      orderBy: { fechaVencimiento: "asc" },
    });

    // Formatear los cargos
    const cargosFormateados = cargos.map(cargo => ({
      id: cargo.id,
      cargoNo: cargo.cargoNo,
      tipo: cargo.tipo,
      fechaVencimiento: cargo.fechaVencimiento,
      monto: cargo.montoOriginal.toNumber(),
      recargo: cargo.recargo.toNumber(),
      montoTotal: cargo.montoTotal.toNumber(),
      saldoPendiente: cargo.saldoPendiente.toNumber(),
      estudiante: cargo.estudiante,
    }));

    const balanceTotal = cargosFormateados.reduce((sum, cargo) => sum + cargo.saldoPendiente, 0);

    return NextResponse.json({
      tutor: {
        id: tutor.id,
        cuentaNo: tutor.cuentaNo,
        nombre: tutor.nombre,
        apellido: tutor.apellido,
        direccion: tutor.direccion,
        celular: tutor.celular,
      },
      cargosPendientes: cargosFormateados,
      balanceTotal,
    });
  } catch (error) {
    console.error("Error GET /api/financiero/cargos-pendientes:", error);
    return NextResponse.json({ error: "Error al obtener cargos pendientes" }, { status: 500 });
  }
}
