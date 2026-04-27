import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const ventas = await prisma.ventaUniforme.findMany({
      orderBy: { fecha: "desc" },
      include: {
        uniforme:   { select: { nombre: true, talla: true } },
        estudiante: { select: { nombre: true, apellido: true, codigo: true } },
      },
    });
    return NextResponse.json({ ventas });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener ventas." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol     = (session?.user as any)?.role;
    const email   = session?.user?.email;

    if (!["ADMINISTRADOR", "CAJERO"].includes(rol)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const { uniformeId, estudianteId, cantidad, metodoPago, observaciones } = await req.json();
    if (!uniformeId || !estudianteId || !cantidad || !metodoPago) {
      return NextResponse.json({ error: "Todos los campos son obligatorios." }, { status: 400 });
    }

    const uniforme = await prisma.uniforme.findUnique({ where: { id: parseInt(uniformeId) } });
    if (!uniforme) return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });

    const cant = parseInt(cantidad);
    if (uniforme.stock < cant) {
      return NextResponse.json({ error: `Stock insuficiente. Disponible: ${uniforme.stock}` }, { status: 400 });
    }

    const total = uniforme.precio * cant;

    // Generar número de venta
    const contador = await prisma.contador.upsert({
      where:  { id: "VU" },
      update: { ultimoNumero: { increment: 1 } },
      create: { id: "VU", ultimoNumero: 1 },
    });
    const ventaNo = `VU-${String(contador.ultimoNumero).padStart(5, "0")}`;

    const venta = await prisma.ventaUniforme.create({
      data: {
        ventaNo,
        uniformeId:    parseInt(uniformeId),
        estudianteId:  parseInt(estudianteId),
        cantidad:      cant,
        precioUnitario: uniforme.precio,
        total,
        metodoPago,
        observaciones: observaciones || null,
        realizadoPor:  email!,
      },
    });

    // Descontar stock
    await prisma.uniforme.update({
      where: { id: parseInt(uniformeId) },
      data:  { stock: { decrement: cant } },
    });

    return NextResponse.json({ mensaje: `Venta ${ventaNo} registrada exitosamente.`, venta }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
