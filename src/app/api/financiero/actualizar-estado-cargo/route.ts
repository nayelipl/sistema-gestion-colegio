import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { actualizarEstadosCargos } from "@/lib/actualizar-estados-cargos";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const resultado = await actualizarEstadosCargos();

    return NextResponse.json({
      mensaje: "Estados de cargos actualizados correctamente",
      ...resultado
    });
  } catch (error) {
    console.error("Error actualizando estados de cargos:", error);
    return NextResponse.json({ error: "Error al actualizar estados de cargos" }, { status: 500 });
  }
}
