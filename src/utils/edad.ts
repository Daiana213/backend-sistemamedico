export function calcularEdad(fechaNacimiento: Date): number {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const mesDiff = hoy.getMonth() - fechaNacimiento.getMonth();
  const diaDiff = hoy.getDate() - fechaNacimiento.getDate();

  if (mesDiff < 0 || (mesDiff === 0 && diaDiff < 0)) {
    edad--;
  }

  return edad;
}