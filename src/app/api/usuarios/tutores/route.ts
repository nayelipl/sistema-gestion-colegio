import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarPermiso } from "@/lib/auth-helper";
import bcrypt from "bcryptjs";

const ROLES_VER      = ["ADMINISTRADOR","CAJERO","SECRETARIA_DOCENTE","DIRECCION_ACADEMICA","COORDINACION_ACADEMICA","ORIENTADOR_ESCOLAR","MAESTRO"];
const ROLES_ESCRIBIR = ["ADMINISTRADOR","CAJERO"];

async function generarCuentaNo() {
  const ultimoTutor = await prisma.tutor.findFirst({
    orderBy: { id: "desc" },
    select:  { cuentaNo: true },
  });
  let nuevoNumero = 0;
  if (ultimoTutor?.cuentaNo) nuevoNumero = parseInt(ultimoTutor.cuentaNo) + 1;
  return nuevoNumero.toString().padStart(6, "0");
}

export async function GET(req: NextRequest) {
  const permiso = await verificarPermiso(ROLES_VER);
  if (permiso.error)
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const tutores = await prisma.tutor.findMany({
      select: {
        id: true, cuentaNo: true, nombre: true, apellido: true,
        email: true, celular: true, telefonoResidencial: true,
        telefonoTrabajo: true, ocupacion: true, direccion: true,
      },
    });
    return NextResponse.json(tutores);
  } catch (error) {
    console.error("Error GET /api/usuarios/tutores:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const permiso = await verificarPermiso(ROLES_ESCRIBIR);
  if (permiso.error)
    return NextResponse.json({ error: permiso.error }, { status: permiso.status });

  try {
    const body = await req.json();
    const camposRequeridos = ["nombre", "apellido", "email", "contrasena", "numeroDocIdentidad"];
    for (const campo of camposRequeridos) {
      if (!body[campo])
        return NextResponse.json({ error: `El campo ${campo} es obligatorio` }, { status: 400 });
    }

    const emailExiste = await prisma.tutor.findUnique({ where: { email: body.email } });
    if (emailExiste)
      return NextResponse.json({ error: "Ya existe un tutor con ese email" }, { status: 409 });

    const docExiste = await prisma.tutor.findUnique({ where: { numeroDocIdentidad: body.numeroDocIdentidad } });
    if (docExiste)
      return NextResponse.json({ error: "Ya existe un tutor con ese número de documento" }, { status: 409 });

    const usuarioExiste = await prisma.usuario.findUnique({ where: { email: body.email } });
    if (usuarioExiste)
      return NextResponse.json({ error: "Ya existe una cuenta con ese email" }, { status: 409 });

    const hash     = await bcrypt.hash(body.contrasena, 10);
    const cuentaNo = await generarCuentaNo();

    await prisma.$transaction([
      prisma.tutor.create({
        data: {
          cuentaNo,
          nombre:                  body.nombre,
          apellido:                body.apellido,
          email:                   body.email,
          tipoDocIdentidad:        body.tipoDocIdentidad        || "CEDULA",
          numeroDocIdentidad:      body.numeroDocIdentidad,
          celular:                 body.celular                 || null,
          telefonoResidencial:     body.telefonoResidencial     || null,
          telefonoTrabajo:         body.telefonoTrabajo         || null,
          ocupacion:               body.ocupacion               || null,
          nombreContactoAlterno:   body.nombreContactoAlterno   || null,
          telefonoContactoAlterno: body.telefonoContactoAlterno || null,
          direccion:               body.direccion               || null,
          activo: true,
        },
      }),
      prisma.usuario.create({
        data: {
          nombre:    `${body.nombre} ${body.apellido}`,
          email:     body.email,
          contrasena: hash,
          rol:       "TUTOR",
          activo:    true,
        },
      }),
    ]);

    return NextResponse.json({ mensaje: `Tutor registrado exitosamente. Cuenta No: ${cuentaNo}` }, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/usuarios/tutores:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
