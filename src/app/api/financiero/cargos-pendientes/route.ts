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

    const usuarioRol = (session.user as any)?.role;
    if (!["ADMINISTRADOR", "CONTADOR", "CAJERO"].includes(usuarioRol)) {
      return NextResponse.json({ error: "No tiene permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tutorId = searchParams.get("tutorId");

    console.log("🔍 Buscando cargos para tutorId:", tutorId);

    if (!tutorId) {
      return NextResponse.json({ error: "Se requiere tutorId" }, { status: 400 });
    }

    // Obtener el tutor
    const tutor = await prisma.tutor.findUnique({
      where: { id: parseInt(tutorId) },
    });

    if (!tutor) {
      return NextResponse.json({ error: "Tutor no encontrado" }, { status: 404 });
    }

    console.log("✅ Tutor encontrado:", tutor.cuentaNo, tutor.nombre, tutor.apellido);

    // Obtener cargos pendientes del tutor
    const cargos = await prisma.cargo.findMany({
      where: {
        tutorId: parseInt(tutorId),
        estado: { in: ["PENDIENTE", "ABONADA"] },
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

    console.log(`📊 Cargos encontrados: ${cargos.length}`);
    
    // Mostrar cada cargo encontrado
    cargos.forEach(c => {
      console.log(`  - ${c.cargoNo}: vence ${c.fechaVencimiento.toISOString().split("T")[0]}, saldo: ${c.saldoPendiente}`);
    });

    // Calcular balance total
    const balanceTotal = cargos.reduce((sum, cargo) => sum + Number(cargo.saldoPendiente), 0);
    console.log(`💰 Balance total: ${balanceTotal}`);

    // Obtener estudiantes del tutor
    const estudiantes = await prisma.estudiante.findMany({
      where: { tutorId: parseInt(tutorId) },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        codigo: true,
      },
    });

    console.log(`🎒 Estudiantes del tutor: ${estudiantes.length}`);

    return NextResponse.json({
      tutor: {
        id: tutor.id,
        cuentaNo: tutor.cuentaNo,
        nombre: tutor.nombre,
        apellido: tutor.apellido,
        direccion: tutor.direccion,
        celular: tutor.celular,
      },
      estudiantes,
      cargosPendientes: cargos.map(c => ({
        id: c.id,
        cargoNo: c.cargoNo,
        fechaVencimiento: c.fechaVencimiento,
        monto: Number(c.montoOriginal),
        recargo: Number(c.recargo),
        saldoPendiente: Number(c.saldoPendiente),
        estudianteId: c.estudianteId,
        estudiante: c.estudiante,
      })),
      balanceTotal,
    });
  } catch (error) {
    console.error("Error GET /api/financiero/cargos-pendientes:", error);
    return NextResponse.json({ error: "Error al obtener cargos pendientes" }, { status: 500 });
  }
}
