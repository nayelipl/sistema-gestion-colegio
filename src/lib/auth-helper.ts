import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function verificarPermiso(rolesPermitidos: string[]) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "No autorizado", status: 401 };
  }
  const rol = (session.user as any)?.role;
  if (!rolesPermitidos.includes(rol)) {
    return { error: "No tiene permisos", status: 403 };
  }
  return { session, rol, error: null };
}