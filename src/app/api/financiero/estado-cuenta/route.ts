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

    const { searchParams } = new URL(req.url);
    const tutorId = searchParams.get("tutorId");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const tipo = searchParams.get("tipo");

    const usuarioRol = (session.user as any)?.role;
    const usuarioEmail = session.user?.email;

    let tutorIdFinal: number | null = null;

    // Caso 1: Se especificó un tutorId en la URL (admin/contador/cajero viendo un tutor específico)
    if (tutorId) {
      tutorIdFinal = parseInt(tutorId);
      
      // Verificar permisos: solo admin, contador y cajero pueden ver cualquier tutor
      if (!["ADMINISTRADOR", "CONTADOR", "CAJERO"].includes(usuarioRol)) {
        return NextResponse.json({ error: "No tiene permisos para ver este estado de cuenta" }, { status: 403 });
      }
    } 
    // Caso 2: No se especificó tutorId, intentar obtener del usuario logueado
    else {
      // Buscar tutor por email
      const tutor = await prisma.tutor.findFirst({
        where: { email: usuarioEmail || "" }
      });
      
      if (tutor) {
        tutorIdFinal = tutor.id;
      } else {
        // Si no es tutor, puede ser admin/contador/cajero viendo su propio panel
        if (["ADMINISTRADOR", "CONTADOR", "CAJERO"].includes(usuarioRol)) {
          return NextResponse.json({
            tutor: null,
            movimientos: [],
            resumen: { totalDebito: 0, totalCredito: 0, balance: 0 },
            mensaje: "Seleccione un tutor para ver su estado de cuenta"
          });
        }
        return NextResponse.json({ error: "Tutor no encontrado" }, { status: 404 });
      }
    }

    // Filtros
    const where: any = { tutorId: tutorIdFinal };
    
    if (fechaDesde) {
      where.fecha = { ...where.fecha, gte: new Date(fechaDesde) };
    }
    if (fechaHasta) {
      where.fecha = { ...where.fecha, lte: new Date(fechaHasta) };
    }
    if (tipo && tipo !== "TODOS" && tipo !== "INSCRIPCION") {
      where.tipo = tipo;
    }

    const movimientos = await prisma.movimientoContable.findMany({
      where,
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
      orderBy: [{ fecha: "asc" }, { hora: "asc" }],
    });

    const tutor = await prisma.tutor.findUnique({
      where: { id: tutorIdFinal },
    });

    const totalDebito = movimientos.reduce((sum, m) => sum + Number(m.debito), 0);
    const totalCredito = movimientos.reduce((sum, m) => sum + Number(m.credito), 0);
    const balanceFinal = movimientos.length > 0 ? Number(movimientos[movimientos.length - 1].balance) : 0;

    const movimientosFormateados = movimientos.map(m => ({
        ...m,
        debito: Number(m.debito),
        credito: Number(m.credito),
        balance: Number(m.balance),
    }));

    return NextResponse.json({
    tutor: tutor ? {
        cuentaNo: tutor.cuentaNo,
        nombre: tutor.nombre,
        apellido: tutor.apellido,
        direccion: tutor.direccion,
        celular: tutor.celular,
    } : null,
    movimientos: movimientosFormateados,
    resumen: {
        totalDebito: Number(totalDebito),
        totalCredito: Number(totalCredito),
        balance: Number(balanceFinal),
    },
    });
  } catch (error) {
    console.error("Error GET /api/financiero/estado-cuenta:", error);
    return NextResponse.json({ error: "Error al obtener estado de cuenta" }, { status: 500 });
  }
}
