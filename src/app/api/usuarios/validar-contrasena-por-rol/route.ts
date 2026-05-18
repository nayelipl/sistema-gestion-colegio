import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { contrasena, rol } = await req.json();
    
    if (!contrasena) {
      return NextResponse.json({ error: "La contraseña es obligatoria." }, { status: 400 });
    }
    
    if (!rol) {
      return NextResponse.json({ error: "El rol es obligatorio." }, { status: 400 });
    }

    const usuarioAutorizador = await prisma.usuario.findFirst({
      where: { rol: rol, activo: true }
    });

    if (!usuarioAutorizador) {
      return NextResponse.json({ 
        error: `No se encontró un usuario activo con el rol ${rol}.` 
      }, { status: 404 });
    }

    const valida = await bcrypt.compare(contrasena, usuarioAutorizador.contrasena);
    if (!valida) {
      return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
    }

    return NextResponse.json({ 
      valido: true, 
      mensaje: `Autorización correcta para rol ${rol}.`,
      autorizador: {
        id: usuarioAutorizador.id,
        nombre: usuarioAutorizador.nombre,
        email: usuarioAutorizador.email,
        rol: usuarioAutorizador.rol
      }
    });
  } catch (error) {
    console.error("Error validando contraseña por rol:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
