import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  await p.publicacion.deleteMany({ where: { id: { in: [7,8,9,10,11,12] } } });
  console.log("✅ Duplicados eliminados.");
}

main().catch(console.error).finally(() => p.$disconnect());
