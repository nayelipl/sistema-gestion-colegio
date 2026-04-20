import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { calcularEdad } from "@/lib/calcular-edad";

async function generarCodigoEstudiante() {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const dosUltimosDigitos = año.toString().slice(-2);

  const ultimoEstudiante = await prisma.estudiante.findFirst({
    where: {
      codigo: {
        startsWith: dosUltimosDigitos
      }
    },
    orderBy: {
      codigo: 'desc'
    },
    select: {
      codigo: true
    }
  });

   let consecutivo = 0;
  
  if (ultimoEstudiante && ultimoEstudiante.codigo) {
    const ultimoNumero = parseInt(ultimoEstudiante.codigo.slice(-4));
    consecutivo = ultimoNumero + 1;
  }
  
  if (consecutivo > 9999) {
    throw new Error("Límite de estudiantes por año alcanzado (10000).");
  }
  
  return `${dosUltimosDigitos}${consecutivo.toString().padStart(4, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const { 
      nombre, 
      apellido, 
      RNE, 
      fechaNac, 
      lugarNac, 
      tutorId, 
      email, 
      contrasena,
      parentesco,
      parentescoEspecificar,
      guardianLegal,
      viveCon,
      viveConEspecificar,
      direccion,
      sexo,
      folio,
      libro,
      numeroActa,
      anioActa,
      padreNombre,
      padreApellido,
      padreTipoDoc,
      padreNumeroDoc,
      padreOcupacion,
      padreCelular,
      padreTelefonoResidencial,
      padreTelefonoTrabajo,
      padreDireccion,
      padreEmail,
      madreNombre,
      madreApellido,
      madreTipoDoc,
      madreNumeroDoc,
      madreOcupacion,
      madreCelular,
      madreTelefonoResidencial,
      madreTelefonoTrabajo,
      madreDireccion,
      madreEmail,
    } = await req.json();

    if (!nombre || !apellido || !fechaNac || !lugarNac || !email || !contrasena || !tutorId || !parentesco || !sexo) {
      return NextResponse.json({ 
        error: "Nombre, apellido, fecha de nacimiento, lugar de nacimiento, email, contraseña, tutor, parentesco y sexo son obligatorios." 
      }, { status: 400 });
    }

    const existeUsuario = await prisma.usuario.findUnique({ where: { email } });
    if (existeUsuario) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo." }, { status: 409 });
    }

    if (RNE) {
      const existeEstudiante = await prisma.estudiante.findFirst({
        where: { RNE: RNE }
      });
      if (existeEstudiante) {
        return NextResponse.json({ error: "Ya existe un estudiante con ese RNE." }, { status: 409 });
      }
    }

    let codigo = await generarCodigoEstudiante();

    const fechaNacDate = new Date(fechaNac);
    const edadCalculada = calcularEdad(fechaNacDate);

    const hash = await bcrypt.hash(contrasena, 10);

    const parentescoFinal = parentesco === "OTRO" ? parentescoEspecificar : parentesco;
    const viveConFinal = viveCon === "OTRO" ? viveConEspecificar : viveCon;

    await prisma.$transaction([
      prisma.estudiante.create({
        data: {
          codigo,
          nombre,
          apellido,
          RNE: RNE || null,
          fechaNac: fechaNacDate,
          lugarNac: lugarNac,
          edad: edadCalculada,
          sexo,
          direccion: direccion || null,
          tutorId: parseInt(tutorId),
          parentesco: parentescoFinal,
          guardianLegal: guardianLegal || null,
          viveCon: viveConFinal,
          folio: folio || null,
          libro: libro || null,
          numeroActa: numeroActa || null,
          anioActa: anioActa || null,
          padreNombre: padreNombre || null,
          padreApellido: padreApellido || null,
          padreTipoDocIdentidad: padreTipoDoc || null,
          padreNumeroDocIdentidad: padreNumeroDoc || null,
          padreOcupacion: padreOcupacion || null,
          padreCelular: padreCelular || null,
          padreTelefonoResidencial: padreTelefonoResidencial || null,
          padreTelefonoTrabajo: padreTelefonoTrabajo || null,
          padreDireccion: padreDireccion || null,
          padreEmail: padreEmail || null,
          madreNombre: madreNombre || null,
          madreApellido: madreApellido || null,
          madreTipoDocIdentidad: madreTipoDoc || null,
          madreNumeroDocIdentidad: madreNumeroDoc || null,
          madreOcupacion: madreOcupacion || null,
          madreCelular: madreCelular || null,
          madreTelefonoResidencial: madreTelefonoResidencial || null,
          madreTelefonoTrabajo: madreTelefonoTrabajo || null,
          madreDireccion: madreDireccion || null,
          madreEmail: madreEmail || null,
          activo: true,
        }
      }),
      prisma.usuario.create({
        data: {
          nombre: `${nombre} ${apellido}`,
          email,
          contrasena: hash,
          rol: "ESTUDIANTE",
          activo: true
        }
      }),
    ]);

    return NextResponse.json({ 
      mensaje: `Estudiante registrado. Código asignado: ${codigo}`,
      codigo 
    }, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/usuarios/estudiantes:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
