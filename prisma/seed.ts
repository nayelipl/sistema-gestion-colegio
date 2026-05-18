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

  await import('./seed_calendario')
  await import('./seed_circulares')
  await import('./seed_fix_circulares')

// Crear tutor genérico para ingresos varios (solo si no existe)
  const tutorVarios = await prisma.tutor.upsert({
    where: { cuentaNo: "000000" },
    update: {},
    create: {
      cuentaNo: "000000",
      nombre: "VARIOS",
      apellido: "INGRESOS",
      tipoDocIdentidad: "CEDULA",
      numeroDocIdentidad: "00000000000",
      email: "varios_sistema@colegio.edu", // ← Email único y fijo
      ocupacion: "SISTEMA",
      nombreContactoAlterno: "SISTEMA",
      telefonoContactoAlterno: "000-000-0000",
    },
  });

  console.log("Tutor varios creado/verificado:", tutorVarios.cuentaNo);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
