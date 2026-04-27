import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
p.publicacion.findMany({ where: { tipo: "CIRCULAR" }, select: { id: true, titulo: true, publicado: true, destinatario: true } })
  .then((r: any) => { console.log(JSON.stringify(r, null, 2)); p.$disconnect(); });
