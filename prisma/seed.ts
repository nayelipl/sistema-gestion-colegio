import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const contrasena = await bcrypt.hash("admin123", 10);

  await prisma.usuario.upsert({
    where: { email: "admin@colegio.edu" },
    update: {},
    create: {
      nombre:    "Administrador",
      email:     "admin@colegio.edu",
      contrasena: contrasena,
      rol:       "ADMINISTRADOR",
      activo:    true,
    },
  });

  console.log("✅ Usuario administrador creado:");
  console.log("   Email:     admin@colegio.edu");
  console.log("   Contraseña: admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
