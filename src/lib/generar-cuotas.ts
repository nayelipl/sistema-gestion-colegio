import { ajustarFechasAPI } from './ajustar-fechas';
import { formatFechaLocal } from './formatear-fecha';

export type ConfiguracionCuota = {
  numero: number;
  mes: number;
  anio: number;
  dia: number;
};

export type ParametrosGeneracion = {
  numCuotas: number;
  diaVencimiento: number;
  anioEscolar: string;
  saltarMeses?: number; // 1 para mensual, 2 para bimestral, etc.
  mesInicio?: number; // 9 para septiembre
};

// Genera la configuración de cuotas basada en parámetros generales
export function generarConfiguracionCuotas(params: ParametrosGeneracion): ConfiguracionCuota[] {
  const { numCuotas, diaVencimiento, anioEscolar, saltarMeses = 1, mesInicio = 9 } = params;
  const [anioInicio] = anioEscolar.split("-").map(Number);
  
  if (isNaN(anioInicio)) return [];
  
  const configuracion: ConfiguracionCuota[] = [];
  let mesActual = mesInicio;
  let anioActual = anioInicio;
  
  // CAMBIADO: i empieza en 1, no en 0
  for (let i = 1; i <= numCuotas; i++) {
    // Ajustar si pasa de diciembre
    if (mesActual > 12) {
      mesActual = mesActual - 12;
      anioActual++;
    }
    
    configuracion.push({
      numero: i,  // AHORA i es 1, 2, 3...
      mes: mesActual,
      anio: anioActual,
      dia: diaVencimiento,
    });
    
    mesActual += saltarMeses;
  }

  // Verificar que no haya números duplicados
  const numeros = configuracion.map(c => c.numero);
  const numerosUnicos = new Set(numeros);
  if (numeros.length !== numerosUnicos.size) {
    console.error("BUG: Números duplicados en generación", numeros);
  }
  
  return configuracion;
}

// Obtiene la fecha correcta usando ajustarFechasAPI (para evitar zona horaria)
export function obtenerFechaCuota(anio: number, mes: number, dia: number): Date {
  const fechaStr = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  const { fechaDesde } = ajustarFechasAPI(fechaStr, undefined);
  return fechaDesde || new Date(anio, mes - 1, dia);
}

// Obtiene la fecha formateada para mostrar en UI
export function obtenerFechaCuotaFormateada(anio: number, mes: number, dia: number): string {
  return formatFechaLocal(obtenerFechaCuota(anio, mes, dia));
}

// Valida si una configuración de cuotas es correcta
export function validarConfiguracionCuotas(configuracion: ConfiguracionCuota[]): boolean {
  if (!configuracion || configuracion.length === 0) return false;
  
  // Verificar que no haya fechas duplicadas
  const fechas = configuracion.map(c => `${c.anio}-${c.mes}-${c.dia}`);
  return fechas.length === new Set(fechas).size;
}

// Obtiene las fechas de vencimiento desde una configuración (usando ajustarFechasAPI)
export function obtenerFechasDesdeConfiguracion(configuracion: ConfiguracionCuota[]): Date[] {
  return configuracion.map(c => obtenerFechaCuota(c.anio, c.mes, c.dia));
}

// Genera fechas para las cuotas de transporte
export function generarFechasTransporte(
  anioEscolar: string,
  numCuotas: number,
  diaVencimiento: number,
  mesInicio: number = 8
): Date[] {
  const configuracion = generarConfiguracionCuotas({
    numCuotas,
    diaVencimiento,
    anioEscolar,
    saltarMeses: 1,
    mesInicio,
  });
  return obtenerFechasDesdeConfiguracion(configuracion);
}
