export function calcularEdad(fechaNacimiento: Date): number {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const mes = hoy.getMonth() - fechaNacimiento.getMonth();
  
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
    edad--;
  }
  
  let meses = mes;
  if (mes < 0) meses = mes + 12;
  if (hoy.getDate() < fechaNacimiento.getDate()) meses--;
  if (meses < 0) meses = 0;
  
  const decimal = parseFloat((meses / 12).toFixed(1));
  const edadFinal = edad + decimal;
  
  return parseFloat(edadFinal.toFixed(1));
}

export function calcularEdadDisplay(fechaNacStr: string): string {
  if (!fechaNacStr) return "";
  const fechaNac = new Date(fechaNacStr);
  const edad = calcularEdad(fechaNac);
  return `${edad} años`;
}