import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const circulares = [
  {
    titulo: "Inicio del Año Escolar 2025-2026",
    contenido: "Estimadas familias,\n\nNos complace darles la bienvenida al nuevo año escolar 2025-2026. Las clases iniciarán el 20 de agosto para Inicial, 1ero y 2do de Primaria, el 21 de agosto para 3ero a 6to de Primaria, y el 25 de agosto para Secundaria.\n\nLes recordamos que deben presentarse con el uniforme completo y sus útiles escolares. El horario de entrada es a las 7:30 a.m.\n\nCordialmente,\nLa Dirección",
  },
  {
    titulo: "Reunión de Padres - Inicio de Año",
    contenido: "Estimados tutores,\n\nLes informamos que las reuniones de padres del inicio del año escolar se realizarán de la siguiente manera:\n\n• Inicial y Primaria: 8 de septiembre\n• Secundaria: 9 de septiembre\n\nLa asistencia es obligatoria. En estas reuniones se presentarán los docentes, el reglamento escolar y el plan académico del año.\n\nHorario: 6:00 p.m.\n\nCordialmente,\nLa Dirección",
  },
  {
    titulo: "Normas del Uniforme Escolar 2025-2026",
    contenido: "Estimadas familias,\n\nLes recordamos las normas del uniforme escolar vigentes:\n\n• El uniforme debe estar limpio y en buen estado.\n• No se permiten accesorios que no correspondan al uniforme.\n• El calzado debe ser negro y cerrado.\n• El cabello debe estar recogido para las damas.\n• No se permiten tintes de colores llamativos.\n\nEl incumplimiento de estas normas puede resultar en una nota de conducta.\n\nCordialmente,\nCoordinación Académica",
  },
  {
    titulo: "Calendario de Evaluaciones - Primer Período",
    contenido: "Estimados padres y tutores,\n\nLes comunicamos que la entrega de evaluaciones del primer período se realizará de la siguiente manera:\n\n• Primaria: 22 de octubre\n• Secundaria: 23 de octubre (virtual a través de la plataforma)\n• Inicial: según comunicación de la maestra\n\nLes recordamos que pueden revisar las calificaciones de sus representados a través del portal académico con sus credenciales de acceso.\n\nCordialmente,\nSecretaría Docente",
  },
  {
    titulo: "Feria de Ciencias 2025",
    contenido: "Estimadas familias,\n\nNos complace invitarles a nuestra Feria de Ciencias que se celebrará el 27 de noviembre.\n\nLos estudiantes presentarán proyectos científicos elaborados durante el trimestre. La actividad está abierta a toda la comunidad escolar.\n\nHorario: 8:00 a.m. – 12:00 m.\nLugar: Área de actividades del colegio\n\nEsperamos contar con su presencia.\n\nCordialmente,\nDepartamento de Ciencias",
  },
  {
    titulo: "Espectáculo de Navidad 2025",
    contenido: "Estimadas familias,\n\nCon gran alegría les invitamos a nuestro tradicional Espectáculo de Navidad que se celebrará el 6 de diciembre.\n\nNuestros estudiantes presentarán números musicales, teatrales y dancísticos alusivos a la temporada navideña.\n\nHorario: 6:00 p.m.\nLugar: Auditorio del colegio\n\nLa entrada es libre para las familias de nuestra comunidad escolar.\n\nCordialmente,\nDepartamento de Arte y Cultura",
  },
];

async function main() {
  console.log("Insertando circulares...");
  for (const c of circulares) {
    await prisma.publicacion.create({
      data: {
        titulo:      c.titulo,
        contenido:   c.contenido,
        tipo:        "CIRCULAR",
        destinatario: "TODOS",
        publicado:   true,
        creadoPor:   "sistema",
      },
    });
  }
  console.log(`✅ ${circulares.length} circulares insertadas.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
