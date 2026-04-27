import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const circulares = await prisma.publicacion.findMany({
    where: { tipo: "CIRCULAR" },
    orderBy: { id: "asc" },
  });

  const fechas = [
    "2025-08-15T12:00:00Z", // Inicio del Año Escolar
    "2025-09-05T12:00:00Z", // Reunión de Padres
    "2025-08-20T12:00:00Z", // Normas del Uniforme
    "2025-10-20T12:00:00Z", // Calendario de Evaluaciones
    "2025-11-20T12:00:00Z", // Feria de Ciencias
    "2025-12-01T12:00:00Z", // Espectáculo de Navidad
  ];

  for (let i = 0; i < circulares.length; i++) {
    if (fechas[i]) {
      await prisma.publicacion.update({
        where: { id: circulares[i].id },
        data:  { creadoEn: new Date(fechas[i]) },
      });
      console.log(`✅ Actualizada: ${circulares[i].titulo} → ${fechas[i]}`);
    }
  }
  console.log("Listo.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
