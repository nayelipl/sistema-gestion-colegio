import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  // Eliminar todas las circulares anteriores
  await p.publicacion.deleteMany({ where: { tipo: "CIRCULAR" } });
  console.log("🗑️ Circulares anteriores eliminadas.");

  // Insertar las nuevas basadas en el calendario académico
  const circulares = [
    {
      titulo: "Inicio de docencia Inicial, 1ero y 2do de Primaria",
      contenido: "Estimadas familias,\n\nLes informamos que el inicio de clases para los niveles Inicial, Primero y Segundo de Primaria será el día 19 de agosto de 2025.\n\nLes recordamos presentarse puntualmente a las 7:30 a.m. con el uniforme completo y los útiles escolares.\n\nCordialmente,\nLa Dirección",
      fecha: "2025-08-19T12:00:00Z",
    },
    {
      titulo: "Inicio de docencia 3ero a 6to de Primaria",
      contenido: "Estimadas familias,\n\nLes informamos que el inicio de clases para los grados Tercero a Sexto de Primaria será el día 20 de agosto de 2025.\n\nLes recordamos presentarse puntualmente a las 7:30 a.m. con el uniforme completo y los útiles escolares.\n\nCordialmente,\nLa Dirección",
      fecha: "2025-08-20T12:00:00Z",
    },
    {
      titulo: "Inicio de docencia Secundaria",
      contenido: "Estimadas familias,\n\nLes informamos que el inicio de clases para el Nivel Secundario será el día 24 de agosto de 2025.\n\nEl horario para este primer día será de 8:00 a.m. a 12:00 m.\n\nCordialmente,\nLa Dirección",
      fecha: "2025-08-24T12:00:00Z",
    },
    {
      titulo: "Entrega de la 1era Evaluación de Primaria",
      contenido: "Estimados padres y tutores,\n\nLes comunicamos que la entrega de la Primera Evaluación del Nivel Primario se realizará el día 21 de octubre de 2025.\n\nPodrán revisar las calificaciones de sus representados a través del portal académico con sus credenciales de acceso.\n\nCordialmente,\nSecretaría Docente",
      fecha: "2025-10-21T12:00:00Z",
    },
    {
      titulo: "Entrega de la 1era Evaluación de Secundaria - Virtual",
      contenido: "Estimados padres y tutores,\n\nLes comunicamos que la entrega de la Primera Evaluación del Nivel Secundario se realizará el día 22 de octubre de 2025 de forma virtual a través de la plataforma.\n\nPodrán revisar las calificaciones de sus representados a través del portal académico con sus credenciales de acceso.\n\nCordialmente,\nSecretaría Docente",
      fecha: "2025-10-22T12:00:00Z",
    },
    {
      titulo: "Feria de Ciencias 2025",
      contenido: "Estimadas familias,\n\nNos complace invitarles a nuestra Feria de Ciencias que se celebrará el 26 de noviembre de 2025.\n\nLos estudiantes presentarán proyectos científicos elaborados durante el trimestre. La actividad está abierta a toda la comunidad escolar.\n\nHorario: 8:00 a.m. – 12:00 m.\nLugar: Área de actividades del colegio\n\nEsperamos contar con su presencia.\n\nCordialmente,\nDepartamento de Ciencias",
      fecha: "2025-11-26T12:00:00Z",
    },
    {
      titulo: "Espectáculo de Navidad 2025",
      contenido: "Estimadas familias,\n\nCon gran alegría les invitamos a nuestro tradicional Espectáculo de Navidad que se celebrará el 5 de diciembre de 2025.\n\nNuestros estudiantes presentarán números musicales, teatrales y dancísticos alusivos a la temporada navideña.\n\nHorario: 6:00 p.m.\nLugar: Auditorio del colegio\n\nLa entrada es libre para las familias de nuestra comunidad escolar.\n\nCordialmente,\nDepartamento de Arte y Cultura",
      fecha: "2025-12-05T12:00:00Z",
    },
  ];

  for (const c of circulares) {
    await p.publicacion.create({
      data: {
        titulo:      c.titulo,
        contenido:   c.contenido,
        tipo:        "CIRCULAR",
        destinatario: "TODOS",
        publicado:   true,
        creadoPor:   "sistema",
        creadoEn:    new Date(c.fecha),
      },
    });
    console.log(`✅ Creada: ${c.titulo}`);
  }
  console.log("Listo.");
}

main().catch(console.error).finally(() => p.$disconnect());
