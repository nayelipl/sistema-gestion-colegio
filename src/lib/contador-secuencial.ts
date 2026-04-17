import { prisma } from "./prisma";

export async function obtenerSiguienteNumero(prefijo: string): Promise<string> {
  // Obtener el contador actual
  let contador = await prisma.contador.findUnique({
    where: { id: prefijo }
  });

  let nuevoNumero = 1;
  
  if (contador) {
    nuevoNumero = contador.ultimoNumero + 1;
    // Actualizar el contador
    await prisma.contador.update({
      where: { id: prefijo },
      data: { ultimoNumero: nuevoNumero }
    });
  } else {
    // Si no existe el contador, crearlo con valor 1
    await prisma.contador.create({
      data: {
        id: prefijo,
        ultimoNumero: 1
      }
    });
  }

  // Formatear a 10 dígitos
  const numeroFormateado = nuevoNumero.toString().padStart(10, "0");
  return `${prefijo}-${numeroFormateado}`;
}

export async function obtenerSiguienteInscripcionNo(): Promise<string> {
  let contador = await prisma.contador.findUnique({
    where: { id: "INSC" }
  });

  let nuevoNumero = 1;
  
  if (contador) {
    nuevoNumero = contador.ultimoNumero + 1;
    await prisma.contador.update({
      where: { id: "INSC" },
      data: { ultimoNumero: nuevoNumero }
    });
  } else {
    await prisma.contador.create({
      data: {
        id: "INSC",
        ultimoNumero: 1
      }
    });
  }

  return `INSC-${nuevoNumero.toString().padStart(10, "0")}`;
}
