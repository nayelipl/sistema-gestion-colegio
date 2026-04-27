import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  await p.publicacion.updateMany({
    where: { tipo: "CIRCULAR" },
    data:  { publicado: true },
  });
  console.log("✅ Circulares publicadas.");
}

main().catch(console.error).finally(() => p.$disconnect());
