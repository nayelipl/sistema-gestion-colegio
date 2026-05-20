// Para redistribuir el excedente del valor cobrado de un cargo a los siguientes cargos disponibles
export function redistribuirExcedente(
  cargoId: number,
  nuevoValor: number,
  cargosFiltrados: any[],
  cargosSeleccionados: Record<number, number>
): Record<number, number> {
  const cargoIndex = cargosFiltrados.findIndex(c => c.id === cargoId);
  if (cargoIndex === -1) return cargosSeleccionados;
  
  const cargo = cargosFiltrados[cargoIndex];
  const montoTotal = (cargo.monto || 0) + (cargo.recargo || 0);
  
  let valorAjustado = isNaN(nuevoValor) ? 0 : Math.round(nuevoValor * 100) / 100;
  valorAjustado = Math.max(0, valorAjustado);
  
  const nuevosSeleccionados: Record<number, number> = {};
  
  // Copiar todos los valores existentes
  Object.keys(cargosSeleccionados).forEach(key => {
    nuevosSeleccionados[parseInt(key)] = cargosSeleccionados[parseInt(key)];
  });
  
  // Limitar al máximo y calcular excedente
  const excedente = Math.max(0, valorAjustado - montoTotal);
  nuevosSeleccionados[cargo.id] = Math.min(valorAjustado, montoTotal);
  
  if (excedente > 0) {
    let excedenteRestante = excedente;
    for (let i = cargoIndex + 1; i < cargosFiltrados.length && excedenteRestante > 0; i++) {
      const cargoSig = cargosFiltrados[i];
      const montoMaxSig = (cargoSig.monto || 0) + (cargoSig.recargo || 0);
      const valorActualSig = nuevosSeleccionados[cargoSig.id] || 0;
      const espacioDisponible = montoMaxSig - valorActualSig;
      
      if (espacioDisponible > 0) {
        const asignar = Math.min(excedenteRestante, espacioDisponible);
        nuevosSeleccionados[cargoSig.id] = Math.round((valorActualSig + asignar) * 100) / 100;
        excedenteRestante = Math.round((excedenteRestante - asignar) * 100) / 100;
      }
    }
  }
  
  return nuevosSeleccionados;
}
