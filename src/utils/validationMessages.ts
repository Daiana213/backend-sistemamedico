/**
 * Utilidad para generar mensajes de validación personalizados automáticamente
 */

export const generarMensajesCampo = (nombreCampo: string) => {
  const formatoNombre = nombreCampo
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .trim();

  return {
    requerido: `El campo ${formatoNombre} es obligatorio.`,
    minimo: (minimo: number) => `El ${formatoNombre} debe tener al menos ${minimo} caracteres.`,
    maximo: (maximo: number) => `El ${formatoNombre} no puede exceder ${maximo} caracteres.`,
    rango: (minimo: number, maximo: number) =>
      `El ${formatoNombre} debe contener entre ${minimo} y ${maximo} caracteres.`,
    digitos: (cantidad: number) => `El ${formatoNombre} debe contener exactamente ${cantidad} dígitos.`,
    digestosRango: (minimo: number, maximo: number) =>
      `El ${formatoNombre} debe contener entre ${minimo} y ${maximo} dígitos.`,
    email: `Debe ingresar un correo electrónico válido.`,
    regex: `El formato del ${formatoNombre} no es válido.`,
    seleccionar: `Debe seleccionar un ${formatoNombre} válido.`,
    numero: `El ${formatoNombre} debe ser un número válido.`,
    numeroPositivo: `El ${formatoNombre} debe ser un número positivo.`,
    fecha: `La ${formatoNombre} es inválida o no fue proporcionada.`,
    boolean: `El ${formatoNombre} es requerido.`,
  };
};

/**
 * Crea un objeto de mensajes reutilizable para validaciones
 */
export const crearMensajes = (campos: string[]) => {
  return campos.reduce((acc, campo) => {
    acc[campo] = generarMensajesCampo(campo);
    return acc;
  }, {} as Record<string, ReturnType<typeof generarMensajesCampo>>);
};

/**
 * Mensajes predefinidos por tipo de campo común
 */
export const MENSAJES_TIPO = {
  dni: 'El DNI debe contener entre 7 y 8 dígitos.',
  telefono: 'El teléfono debe contener entre 8 y 15 dígitos.',
  password: 'La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula y un número.',
  email: 'Debe ingresar un correo electrónico válido.',
  fecha: 'La fecha proporcionada no es válida.',
  sexo: 'Debe seleccionar un sexo válido (Masculino, Femenino u Otro).',
  booleano: 'Este campo es requerido.',
};
