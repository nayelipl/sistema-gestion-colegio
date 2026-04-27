import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const eventos = [
  // AGOSTO
  { titulo: "Bienvenida familias de nuevo ingreso", fechaInicio: "2025-08-15", tipo: "ACTIVIDAD", descripcion: "Bienvenida a familias de nuevo ingreso" },
  { titulo: "Inicio de docencia Inicial, 1ero y 2do de Primaria", fechaInicio: "2025-08-20", tipo: "INICIO_CLASES" },
  { titulo: "Inicio de docencia 3ero a 6to de Primaria", fechaInicio: "2025-08-21", tipo: "INICIO_CLASES" },
  { titulo: "Inicio de docencia Secundaria", fechaInicio: "2025-08-25", tipo: "INICIO_CLASES", descripcion: "Horario de 8:00 a.m. a 12:00 m." },
  // SEPTIEMBRE
  { titulo: "Reunión de padres Inicial y Primaria", fechaInicio: "2025-09-08", tipo: "ACTIVIDAD" },
  { titulo: "Reunión de padres Secundaria", fechaInicio: "2025-09-09", tipo: "ACTIVIDAD" },
  { titulo: "Día Internacional de la Paz", fechaInicio: "2025-09-21", tipo: "OTRO" },
  { titulo: "Elección Consejos de Curso", fechaInicio: "2025-09-15", fechaFin: "2025-09-19", tipo: "ACTIVIDAD" },
  { titulo: "Día de Nuestra Señora de las Mercedes (Patrona de la Rep. Dom.)", fechaInicio: "2025-09-24", tipo: "FERIADO" },
  { titulo: "Primera ronda Olimpiadas de Matemática SJT", fechaInicio: "2025-09-26", tipo: "ACTIVIDAD" },
  { titulo: "Claustro Docente - Salida a las 12:00 m.", fechaInicio: "2025-09-26", tipo: "OTRO", descripcion: "Último viernes del mes" },
  { titulo: "Día de Enriquillo / Día Nacional de la Biblia", fechaInicio: "2025-09-27", tipo: "OTRO" },
  // OCTUBRE
  { titulo: "Ronda Final Olimpiadas de Matemática SJT", fechaInicio: "2025-10-03", tipo: "ACTIVIDAD" },
  { titulo: "Día Mundial de los Docentes", fechaInicio: "2025-10-05", tipo: "OTRO" },
  { titulo: "Día del Encuentro entre Culturas", fechaInicio: "2025-10-12", tipo: "FERIADO" },
  { titulo: "Día de Santa Teresa de Jesús", fechaInicio: "2025-10-15", tipo: "OTRO" },
  { titulo: "Día del Poeta / Natalicio de Salomé Ureña", fechaInicio: "2025-10-16", tipo: "OTRO" },
  { titulo: "Entrega de la 1era Evaluación de Primaria", fechaInicio: "2025-10-22", tipo: "EXAMEN" },
  { titulo: "Entrega de la 1era Evaluación de Secundaria - Virtual", fechaInicio: "2025-10-23", tipo: "EXAMEN" },
  { titulo: "Día de Naciones Unidas (ONU)", fechaInicio: "2025-10-24", tipo: "OTRO" },
  { titulo: "Entrega de Honores Académicos de Primaria 2024-2025", fechaInicio: "2025-10-27", tipo: "ACTIVIDAD" },
  { titulo: "Día de San Judas Tadeo", fechaInicio: "2025-10-28", tipo: "OTRO" },
  { titulo: "Entrega de Honores Académicos de Secundaria 2024-2025", fechaInicio: "2025-10-29", tipo: "ACTIVIDAD" },
  { titulo: "Field Day VEXIA 26 - No Docencia", fechaInicio: "2025-10-31", tipo: "ACTIVIDAD" },
  // NOVIEMBRE
  { titulo: "Día de Todos los Santos", fechaInicio: "2025-11-01", tipo: "FERIADO" },
  { titulo: "Día de los Fieles Difuntos", fechaInicio: "2025-11-02", tipo: "FERIADO" },
  { titulo: "Día de La Constitución", fechaInicio: "2025-11-06", tipo: "FERIADO" },
  { titulo: "Día del Deporte", fechaInicio: "2025-11-07", tipo: "OTRO" },
  { titulo: "Celebrando a los Abuelos (Inicial)", fechaInicio: "2025-11-07", tipo: "ACTIVIDAD" },
  { titulo: "No laborable", fechaInicio: "2025-11-10", tipo: "FERIADO" },
  { titulo: "Día Internacional del Músico / Festival de Coros", fechaInicio: "2025-11-22", tipo: "ACTIVIDAD" },
  { titulo: "Feria de Ciencias", fechaInicio: "2025-11-27", tipo: "ACTIVIDAD" },
  { titulo: "Claustro Docente - No docencia", fechaInicio: "2025-11-28", tipo: "OTRO", descripcion: "Último viernes del mes" },
  // DICIEMBRE
  { titulo: "Bienvenida a la Navidad", fechaInicio: "2025-12-01", tipo: "ACTIVIDAD" },
  { titulo: "Aniversario llegada de Cristóbal Colón a La Española", fechaInicio: "2025-12-05", tipo: "OTRO" },
  { titulo: "Espectáculo de Navidad", fechaInicio: "2025-12-06", tipo: "ACTIVIDAD" },
  { titulo: "Día Internacional de los Derechos Humanos", fechaInicio: "2025-12-10", tipo: "OTRO" },
  { titulo: "Último Día de Clases", fechaInicio: "2025-12-17", tipo: "FIN_CLASES" },
  { titulo: "Entrega de la Evaluación de Inicial", fechaInicio: "2025-12-18", tipo: "EXAMEN" },
  { titulo: "Entrega Evaluación Primaria y Secundaria (Plataforma)", fechaInicio: "2025-12-19", tipo: "EXAMEN" },
  // ENERO
  { titulo: "Año Nuevo", fechaInicio: "2026-01-01", tipo: "FERIADO" },
  { titulo: "Día de Los Santos Reyes", fechaInicio: "2026-01-06", tipo: "FERIADO" },
  { titulo: "Reinicio de la docencia", fechaInicio: "2026-01-07", tipo: "INICIO_CLASES" },
  { titulo: "Día Nacional de la Alfabetización", fechaInicio: "2026-01-13", tipo: "OTRO" },
  { titulo: "Día de La Altagracia (Protectora de la Rep. Dom.)", fechaInicio: "2026-01-21", tipo: "FERIADO" },
  { titulo: "Natalicio de Juan Pablo Duarte - Inicio del Mes de La Patria", fechaInicio: "2026-01-26", tipo: "FERIADO" },
  { titulo: "Claustro Docente - Salida a las 12:00 m.", fechaInicio: "2026-01-30", tipo: "OTRO", descripcion: "Último viernes del mes" },
  { titulo: "Día Nacional de la Juventud", fechaInicio: "2026-01-31", tipo: "OTRO" },
  // FEBRERO
  { titulo: "Día Mundial de los Humedales", fechaInicio: "2026-02-02", tipo: "OTRO" },
  { titulo: "Día Nacional del Folclor", fechaInicio: "2026-02-10", tipo: "OTRO" },
  { titulo: "Día Internacional del Internet Seguro", fechaInicio: "2026-02-14", tipo: "OTRO" },
  { titulo: "Día del Estudiante", fechaInicio: "2026-02-18", tipo: "OTRO" },
  { titulo: "Inicio de la Cuaresma - Miércoles de Ceniza", fechaInicio: "2026-02-18", tipo: "OTRO" },
  { titulo: "Modelo Interno de Naciones Unidas SJT 2026", fechaInicio: "2026-02-20", fechaFin: "2026-02-21", tipo: "ACTIVIDAD" },
  { titulo: "Expo Feria Dominicana", fechaInicio: "2026-02-23", fechaFin: "2026-02-25", tipo: "ACTIVIDAD" },
  { titulo: "Natalicio de Matías Ramón Mella", fechaInicio: "2026-02-25", tipo: "FERIADO" },
  { titulo: "Celebración Acto Patrio", fechaInicio: "2026-02-26", tipo: "ACTIVIDAD" },
  { titulo: "Día Nacional de la Bandera / 182 Aniversario de la Independencia", fechaInicio: "2026-02-27", tipo: "FERIADO" },
  // MARZO
  { titulo: "Día de las Asociaciones de Padres, Madres y Tutores", fechaInicio: "2026-03-03", tipo: "OTRO" },
  { titulo: "Natalicio de Francisco del Rosario Sánchez (Conmemorativo)", fechaInicio: "2026-03-09", tipo: "FERIADO" },
  { titulo: "Día Internacional del Pi", fechaInicio: "2026-03-14", tipo: "OTRO" },
  { titulo: "Aniversario Batalla de Azua (Conmemorativo)", fechaInicio: "2026-03-19", tipo: "FERIADO" },
  { titulo: "Expo España (3ro Secundaria)", fechaInicio: "2026-03-20", tipo: "ACTIVIDAD" },
  { titulo: "Entrega de la 3era Evaluación de Primaria", fechaInicio: "2026-03-23", tipo: "EXAMEN" },
  { titulo: "Entrega de la 2da Evaluación del Nivel Inicial", fechaInicio: "2026-03-23", fechaFin: "2026-03-26", tipo: "EXAMEN" },
  { titulo: "Entrega de la 3era Evaluación de Secundaria", fechaInicio: "2026-03-25", tipo: "EXAMEN" },
  { titulo: "No Docencia - Retiro de Cuaresma del personal", fechaInicio: "2026-03-27", tipo: "RECESO" },
  { titulo: "Aniversario Batalla de Santiago (Conmemorativo)", fechaInicio: "2026-03-30", tipo: "FERIADO" },
  { titulo: "Vacaciones de Semana Santa", fechaInicio: "2026-03-30", fechaFin: "2026-04-06", tipo: "RECESO" },
  // ABRIL
  { titulo: "Día Mundial de la conciencia sobre el Autismo", fechaInicio: "2026-04-02", tipo: "OTRO" },
  { titulo: "Día del Psicólogo / Día Mundial de la Salud", fechaInicio: "2026-04-06", tipo: "OTRO" },
  { titulo: "Reinicio de Docencia", fechaInicio: "2026-04-07", tipo: "INICIO_CLASES" },
  { titulo: "Semana de la Lengua Española", fechaInicio: "2026-04-20", fechaFin: "2026-04-24", tipo: "ACTIVIDAD" },
  { titulo: "Día Mundial de la Tierra", fechaInicio: "2026-04-22", tipo: "OTRO" },
  { titulo: "Día Mundial del Libro y del Derecho de Autor", fechaInicio: "2026-04-23", tipo: "OTRO" },
  { titulo: "Aniversario Revolución de Abril 1965 / Día de los Ayuntamientos", fechaInicio: "2026-04-24", tipo: "FERIADO" },
  { titulo: "Claustro Docente - Salida a las 12:00", fechaInicio: "2026-04-24", tipo: "OTRO", descripcion: "Último viernes de mes" },
  { titulo: "Día de Campo", fechaInicio: "2026-04-26", tipo: "ACTIVIDAD" },
  // MAYO
  { titulo: "Día Internacional del Trabajo", fechaInicio: "2026-05-01", tipo: "FERIADO" },
  { titulo: "Primera Comunión alumnos de 4to de Primaria", fechaInicio: "2026-05-09", tipo: "ACTIVIDAD" },
  { titulo: "Confirmación Alumnos 3ro de Educación Secundaria", fechaInicio: "2026-05-15", tipo: "ACTIVIDAD" },
  { titulo: "Evaluación Diagnóstica para 3ro de Educación Primaria (MINERD)", fechaInicio: "2026-05-18", fechaFin: "2026-05-30", tipo: "EXAMEN" },
  { titulo: "Parents Day (Nivel Inicial)", fechaInicio: "2026-05-22", tipo: "ACTIVIDAD" },
  { titulo: "Clínicas para Pruebas Nacionales (6to Secundaria)", fechaInicio: "2026-05-25", fechaFin: "2026-05-29", tipo: "EXAMEN" },
  { titulo: "Claustro Docente - Salida a las 12:00", fechaInicio: "2026-05-29", tipo: "OTRO", descripcion: "Último viernes de mes" },
  { titulo: "Día de las Madres", fechaInicio: "2026-05-31", tipo: "OTRO" },
  // JUNIO
  { titulo: "Concurso de Spelling Bee", fechaInicio: "2026-06-03", tipo: "ACTIVIDAD" },
  { titulo: "Corpus Christi", fechaInicio: "2026-06-04", tipo: "FERIADO" },
  { titulo: "No docencia / Día Nacional del Medio Ambiente", fechaInicio: "2026-06-05", tipo: "OTRO" },
  { titulo: "Último día de clases", fechaInicio: "2026-06-10", tipo: "FIN_CLASES" },
  { titulo: "Graduación Ya Sé Leer", fechaInicio: "2026-06-13", tipo: "ACTIVIDAD" },
  { titulo: "Gesta Heroica de Constanza, Maimón y Estero Hondo", fechaInicio: "2026-06-14", tipo: "FERIADO" },
  { titulo: "Recuperación pedagógica Primaria / Pruebas completas Secundaria", fechaInicio: "2026-06-15", fechaFin: "2026-06-19", tipo: "EXAMEN" },
  { titulo: "Entrega de Evaluaciones finales para todos los grados", fechaInicio: "2026-06-16", tipo: "EXAMEN" },
  { titulo: "Misa de Bendición Promoción VIXIA 26", fechaInicio: "2026-06-19", tipo: "ACTIVIDAD" },
  { titulo: "Pruebas Extraordinarias Secundaria", fechaInicio: "2026-06-22", fechaFin: "2026-06-24", tipo: "EXAMEN" },
  { titulo: "Pruebas Nacionales 6to Secundaria", fechaInicio: "2026-06-23", fechaFin: "2026-06-26", tipo: "EXAMEN" },
  { titulo: "Entrega de evaluación final (Recuperación, Completivos y Extraordinarios)", fechaInicio: "2026-06-26", tipo: "EXAMEN" },
  { titulo: "Acto de Graduación Promoción VEXIA 26", fechaInicio: "2026-06-27", tipo: "ACTIVIDAD" },
  { titulo: "Día del Maestro", fechaInicio: "2026-06-30", tipo: "OTRO" },
];

async function main() {
  console.log("Insertando eventos del calendario...");
  for (const ev of eventos) {
    await prisma.calendarioEscolar.upsert({
      where: { id: (await prisma.calendarioEscolar.findFirst({ where: { titulo: ev.titulo, fechaInicio: new Date(ev.fechaInicio) } }))?.id || 0 },
      update: {},
      create: {
        titulo:      ev.titulo,
        descripcion: ev.descripcion || null,
        fechaInicio: new Date(ev.fechaInicio),
        fechaFin:    new Date(ev.fechaFin || ev.fechaInicio),
        tipo:        ev.tipo,
        anio:        "2026",
        publicado:   true,
      },
    });
  }
  console.log(`✅ ${eventos.length} eventos insertados.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
