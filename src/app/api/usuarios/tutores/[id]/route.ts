import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";

const ROLES_VER      = ["ADMINISTRADOR","CAJERO","SECRETARIA_DOCENTE","DIRECCION_ACADEMICA","COORDINACION_ACADEMICA"];
const ROLES_ESCRIBIR = ["ADMINISTRADOR","CAJERO"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permiso = await verificarPermiso(ROLES_VER);
  if (permiso.error)
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const buscar = searchParams.get("buscar");

    const where = buscar ? {
      OR: [
        { codigo:   { contains: buscar } },
        { nombre:   { contains: buscar } },
        { apellido: { contains: buscar } },
        { cedula:   { contains: buscar } },
      ],
    } : {};

    const tutores = await prisma.tutor.findMany({
      where,
      orderBy: { nombre: "asc" },
      select: {
        id: true, cuentaNo: true, nombre: true, apellido: true,
        numeroDocIdentidad: true, email: true, celular: true,
      },
    });
    return NextResponse.json(tutores);
  } catch (error) {
    console.error("Error GET /api/usuarios/tutores/[id]:", error);
    return NextResponse.json({ error: "Error al obtener tutores" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permiso = await verificarPermiso(ROLES_ESCRIBIR);
  if (permiso.error)
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id } = await params;
    const data   = await req.json();
    const tutor  = await prisma.tutor.update({
      where: { id: parseInt(id) },
      data: {
        nombre:                  data.nombre,
        apellido:                data.apellido,
        email:                   data.email,
        celular:                 data.celular                 || null,
        telefonoResidencial:     data.telefonoResidencial     || null,
        telefonoTrabajo:         data.telefonoTrabajo         || null,
        ocupacion:               data.ocupacion               || null,
        nombreContactoAlterno:   data.nombreContactoAlterno   || null,
        telefonoContactoAlterno: data.telefonoContactoAlterno || null,
        direccion:               data.direccion               || null,
      },
    });
    return NextResponse.json({ mensaje: "Tutor actualizado.", tutor });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar tutor." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permiso = await verificarPermiso(ROLES_ESCRIBIR);
  if (permiso.error)
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const { id }     = await params;
    const { activo } = await req.json();
    const tutor      = await prisma.tutor.update({
      where: { id: parseInt(id) },
      data:  { activo },
    });
    return NextResponse.json({ mensaje: `Tutor ${activo ? "habilitado" : "inhabilitado"}.`, tutor });
  } catch (error) {
    return NextResponse.json({ error: "Error al cambiar estado." }, { status: 500 });
  }
}
