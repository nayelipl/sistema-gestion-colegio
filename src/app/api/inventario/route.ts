import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const uniformes = await prisma.uniforme.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { ventas: true } } },
    });
    return NextResponse.json({ uniformes });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener inventario." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol     = (session?.user as any)?.role;
    if (!["ADMINISTRADOR", "CAJERO"].includes(rol)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const { nombre, talla, precio, stock, stockMinimo, descripcion } = await req.json();
    if (!nombre || !talla || precio === undefined || stock === undefined) {
      return NextResponse.json({ error: "Nombre, talla, precio y stock son obligatorios." }, { status: 400 });
    }

    const uniforme = await prisma.uniforme.create({
      data: {
        nombre,
        talla,
        precio:      parseFloat(precio),
        stock:       parseInt(stock),
        stockMinimo: parseInt(stockMinimo) || 1,
        descripcion: descripcion || null,
      },
    });

    return NextResponse.json({ mensaje: "Artículo registrado exitosamente.", uniforme }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rol     = (session?.user as any)?.role;
    if (!["ADMINISTRADOR", "CAJERO"].includes(rol)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const { id, nombre, talla, precio, stock, stockMinimo, descripcion } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    const uniforme = await prisma.uniforme.update({
      where: { id: parseInt(id) },
      data: {
        nombre,
        talla,
        precio:      parseFloat(precio),
        stock:       parseInt(stock),
        stockMinimo: parseInt(stockMinimo) || 1,
        descripcion: descripcion || null,
      },
    });

    return NextResponse.json({ mensaje: "Artículo actualizado.", uniforme });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
