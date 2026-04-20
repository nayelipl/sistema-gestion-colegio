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
  const [anioInicio, anioFin] = anioEscolar.split("-").map(Number);
  
  const configuracion: ConfiguracionCuota[] = [];
  
  for (let i = 0; i < numCuotas; i++) {
    let mes = mesInicio + (i * saltarMeses);
    let anio = anioInicio;
    
    // Ajustar si pasa a diciembre
    while (mes > 12) {
      mes -= 12;
      anio++;
    }
    
    // Asegurar que no pase del año fin
    if (anio > anioFin) anio = anioFin;
    
    configuracion.push({
      numero: i + 1,
      mes: mes,
      anio: anio,
      dia: diaVencimiento,
    });
  }
  
  return configuracion;
}

// Valida si una configuración de cuotas es correcta
export function validarConfiguracionCuotas(configuracion: ConfiguracionCuota[]): boolean {
  if (!configuracion || configuracion.length === 0) return false;
  
  // Verificar que no haya fechas duplicadas
  const fechas = configuracion.map(c => `${c.anio}-${c.mes}-${c.dia}`);
  return fechas.length === new Set(fechas).size;
}

// Obtiene las fechas de vencimiento desde una configuración
export function obtenerFechasDesdeConfiguracion(configuracion: ConfiguracionCuota[]): Date[] {
  return configuracion.map(c => new Date(c.anio, c.mes - 1, c.dia));
}

// Genera fechas para las cuotas de transporte (usando mesInicio = 8 para agosto o el que corresponda)
export function generarFechasTransporte(
  anioEscolar: string,
  numCuotas: number,
  diaVencimiento: number,
  mesInicio: number = 8 // Agosto por defecto para transporte
): Date[] {
  const [anioInicio, anioFin] = anioEscolar.split("-").map(Number);
  const fechas: Date[] = [];
  
  for (let i = 0; i < numCuotas; i++) {
    let mes = mesInicio + i;
    let anio = anioInicio;
    
    while (mes > 12) {
      mes -= 12;
      anio++;
    }
    
    if (anio > anioFin) anio = anioFin;
    
    fechas.push(new Date(anio, mes - 1, diaVencimiento));
  }
  
  return fechas;
}
