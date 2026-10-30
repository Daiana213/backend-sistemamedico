import { z } from 'zod';
import { generarMensajesCampo } from '../utils/validationMessages';

const msg = {
  nombreObraSocial: generarMensajesCampo('nombre de la obra social'),
  nombrePlan: generarMensajesCampo('nombre del plan'),
  descripcion: generarMensajesCampo('descripción'),
};

export function validarCuitArgentino(cuitRaw: string): boolean {
  const cuitLimpio = cuitRaw.replace(/[^0-9]/g, '');
  if (cuitLimpio.length !== 11) return false;

  const prefijosValidos = ['20', '23', '24', '27', '30', '33', '34'];
  const prefijo = cuitLimpio.substring(0, 2);
  if (!prefijosValidos.includes(prefijo)) return false;

  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    suma += parseInt(cuitLimpio[i], 10) * multiplicadores[i];
  }

  const resto = suma % 11;
  const verificadorCalculado = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;
  const digitoVerificador = parseInt(cuitLimpio[10], 10);

  return digitoVerificador === verificadorCalculado;
}

export const tipoEntidadSaludEnum = z.enum([
  'OBRA_SOCIAL_SINDICAL',
  'MEDICINA_PREPAGA',
  'OBRA_SOCIAL_PROVINCIAL',
  'PAMI_INSSJP',
  'OTRA',
]);

export const obraSocialSchema = z.object({
  nombre: z
    .string({ error: 'El nombre de la obra social es obligatorio.' })
    .trim()
    .min(1, 'El nombre de la obra social es obligatorio.')
    .min(2, msg.nombreObraSocial.minimo(2))
    .max(100, msg.nombreObraSocial.maximo(100)),
  descripcion: z
    .string({ error: 'La descripción debe ser un texto válido.' })
    .trim()
    .max(255, msg.descripcion.maximo(255))
    .optional()
    .nullable(),
  codigoRnos: z
    .string({ error: 'El código RNOS debe ser un texto válido.' })
    .trim()
    .max(20, 'El código RNOS no puede superar los 20 caracteres.')
    .optional()
    .nullable(),
  cuit: z
    .string({ error: 'El CUIT debe ser un texto válido.' })
    .trim()
    .refine(
      (val) => !val || validarCuitArgentino(val),
      'El CUIT ingresado no es válido para la legislación argentina.'
    )
    .optional()
    .nullable(),
  razonSocial: z
    .string({ error: 'La razón social debe ser un texto válido.' })
    .trim()
    .max(150, 'La razón social no puede superar los 150 caracteres.')
    .optional()
    .nullable(),
  tipo: tipoEntidadSaludEnum.optional().default('OBRA_SOCIAL_SINDICAL'),
});

export const planSchema = z.object({
  nombre: z
    .string({ error: 'El nombre del plan es obligatorio.' })
    .trim()
    .min(1, 'El nombre del plan es obligatorio.')
    .min(2, msg.nombrePlan.minimo(2))
    .max(100, msg.nombrePlan.maximo(100)),
  descripcion: z
    .string({ error: 'La descripción debe ser un texto válido.' })
    .trim()
    .max(255, msg.descripcion.maximo(255))
    .optional()
    .nullable(),
  requiereCopago: z.boolean().optional().default(false),
  montoCopago: z
    .union([z.number().nonnegative(), z.string().regex(/^\d+(\.\d{1,2})?$/)])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      return typeof val === 'number' ? val : parseFloat(val);
    }),
  requiereAutorizacionPrevia: z.boolean().optional().default(false),
});

export const validarElegibilidadSchema = z.object({
  idObraSocial: z.coerce.number().int().positive('Debe indicar una obra social válida.').optional().nullable(),
  idPlan: z.coerce.number().int().positive().optional().nullable(),
  idPaciente: z.coerce.number().int().positive().optional().nullable(),
  idProfesional: z.coerce.number().int().positive().optional().nullable(),
  numeroAfiliado: z.string().trim().max(50).optional().nullable(),
  subfijoAdherente: z.string().trim().max(10).optional().nullable(),
  tokenDigital: z.string().trim().max(20).optional().nullable(),
});

export const simularCoberturaTurnoSchema = z.object({
  idProfesional: z.coerce.number().int().positive('Debe indicar un profesional válido.'),
  idPaciente: z.coerce.number().int().positive().optional().nullable(),
  idObraSocial: z.coerce.number().int().positive().optional().nullable(),
  idPlan: z.coerce.number().int().positive().optional().nullable(),
});

export type ObraSocialInput = z.infer<typeof obraSocialSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type ValidarElegibilidadInput = z.infer<typeof validarElegibilidadSchema>;
export type SimularCoberturaTurnoInput = z.infer<typeof simularCoberturaTurnoSchema>;
