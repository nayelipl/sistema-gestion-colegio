export const ajustarFechasAPI = (fechaDesde?: string, fechaHasta?: string) => {
  const filtros: { fechaDesde?: Date; fechaHasta?: Date } = {};
  
  if (fechaDesde && fechaDesde.trim() !== "") {
    const [year, month, day] = fechaDesde.split('-').map(Number);
    filtros.fechaDesde = new Date(year, month - 1, day, 0, 0, 0, 0);
  }
  
  if (fechaHasta && fechaHasta.trim() !== "") {
    const [year, month, day] = fechaHasta.split('-').map(Number);
    filtros.fechaHasta = new Date(year, month - 1, day, 23, 59, 59, 999);
  }
  
  return filtros;
};