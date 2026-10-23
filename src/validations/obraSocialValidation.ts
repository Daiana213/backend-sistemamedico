import { z } from 'zod';
import { generarMensajesCampo } from '../utils/validationMessages';

const msg = {
  nombreObraSocial: generarMensajesCampo('nombre de la obra social'),
  nombrePlan: generarMensajesCampo('nombre del plan'),
  descripcion: generarMensajesCampo('descripción'),
};

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
});

export type ObraSocialInput = z.infer<typeof obraSocialSchema>;
export type PlanInput = z.infer<typeof planSchema>;
