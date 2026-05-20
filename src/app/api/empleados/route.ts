import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ROLES_PERMITIDOS = ["ADMINISTRADOR", "DIRECTOR_ADMINISTRATIVO"];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rol = (session.user as any)?.role;
    if (!ROLES_PERMITIDOS.includes(rol)) {
      return NextResponse.json({ error: "No tiene permisos para acceder a nómina" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const incluirInactivos = searchParams.get("incluirInactivos") === "true";

    const where: any = {};
    if (!incluirInactivos) {
      where.activo = true;
    }

    const empleados = await prisma.empleado.findMany({
      where,
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    });

    const empleadosFormateados = empleados.map(emp => ({
      id: emp.id,
      nombre: emp.nombre,
      apellido: emp.apellido,
      cedula: emp.cedula,
      email: emp.email,
      telefono: emp.telefono || "—",
      salario: emp.salario ? parseFloat(emp.salario.toString()) : 0,
      activo: emp.activo
    }));

    return NextResponse.json({ empleados: empleadosFormateados });
  } catch (error) {
    console.error("Error GET /api/empleados:", error);
    return NextResponse.json({ error: "Error al obtener empleados" }, { status: 500 });
  }
}