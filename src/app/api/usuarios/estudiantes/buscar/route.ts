import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const tipo = searchParams.get("tipo"); // 'no_matriculados' | 'matriculados' | 'todos'
    const incluirInactivos = searchParams.get("incluirInactivos") === "true";

    const tarifaActiva = await prisma.tarifaAnioEscolar.findFirst({
      where: { activo: true },
      select: { anioEscolar: true }
    });
    
    const anioEscolar = tarifaActiva?.anioEscolar || "2025-2026";

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    // Para buscar no matriculados: no filtrar por activo, solo por matrícula
    let whereCondition: any = {
      OR: [
        { codigo: { contains: q } },
        { nombre: { contains: q } },
        { apellido: { contains: q } },
      ],
    };

    // Solo filtrar por activo si se especifica, para revocar credenciales
    if (!incluirInactivos && tipo !== "no_matriculados") {
      whereCondition.activo = true;
    }

    // Filtro para NO_MATRICULADOS: estudiantes que no tienen matrícula activa
    // No filtrar por activo, porque pueden estar activos pero sin matrícula
    if (tipo === "no_matriculados") {
      whereCondition = {
        ...whereCondition,
        NOT: {
          matriculas: {
            some: {
              anioEscolar: anioEscolar,
              activa: true
            }
          }
        }
      };
    } // Filtro para MATRICULADOS: estudiantes que sí tienen matrícula activa
    else if (tipo === "matriculados") {
      whereCondition = {
        ...whereCondition,
        matriculas: {
          some: {
            anioEscolar: anioEscolar,
            activa: true
          }
        }
      };
    }

    const estudiantes = await prisma.estudiante.findMany({
      where: whereCondition,
      include: {
        tutor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            cuentaNo: true,
          },
        },
        seccion: {
          include: {
            curso: true,
          },
        },
      },
      take: 20,
      orderBy: { nombre: "asc" },
    });

    const resultados = estudiantes.map((est) => ({
      value: est.id,
      label: `${est.codigo} - ${est.nombre} ${est.apellido}`,
      estudiante: {
        id: est.id,
        codigo: est.codigo,
        nombre: est.nombre,
        apellido: est.apellido,
        fechaNac: est.fechaNac,
        edad: est.edad,
        activo: est.activo,
        tutor: est.tutor,
        seccion: est.seccion,
      },
    }));

    return NextResponse.json(resultados);
  } catch (error) {
    console.error("Error GET /api/usuarios/estudiantes/buscar:", error);
    return NextResponse.json({ error: "Error al buscar estudiantes" }, { status: 500 });
  }
}
