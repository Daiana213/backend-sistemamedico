import { z } from 'zod';
import { generarMensajesCampo } from '../utils/validationMessages';

const msg = {
  nombre: generarMensajesCampo('nombre del estudio'),
  codigo: generarMensajesCampo('código del estudio'),
  observacion: generarMensajesCampo('observación'),
};

export const estudioMedicoSchema = z.object({
  nombre: z
    .string({ error: 'El nombre del estudio es obligatorio.' })
    .trim()
    .min(1, 'El nombre del estudio es obligatorio.')
    .min(2, msg.nombre.minimo(2))
    .max(150, msg.nombre.maximo(150)),
  codigo: z
    .preprocess(
      (val) => (val === '' || val === undefined ? undefined : val),
      z
        .string({ error: 'El código del estudio debe ser un texto válido.' })
        .trim()
        .min(1, 'El código del estudio no puede estar vacío.')
        .max(150, msg.codigo.maximo(150))
        .optional()
    ),
  observacion: z
    .preprocess(
      (val) => (val === '' || val === undefined ? null : val),
      z
        .string({ error: 'La observación debe ser un texto válido.' })
        .trim()
        .max(1000, msg.observacion.maximo(1000))
        .nullable()
        .optional()
    ),
});

export const estudioAdminCrearSchema = z
  .object({
    idPaciente: z.coerce
      .number({ error: 'El identificador del paciente debe ser un número válido.' })
      .int('El identificador del paciente debe ser un número entero.')
      .positive('El identificador del paciente debe ser un número positivo.')
      .optional(),
    dniPaciente: z
      .string({ error: 'El DNI del paciente debe ser un texto válido.' })
      .trim()
      .regex(/^\d{7,8}$/, 'El DNI debe contener entre 7 y 8 números.')
      .optional(),
    nombre: z
      .string({ error: 'El nombre del estudio es obligatorio.' })
      .trim()
      .min(1, 'El nombre del estudio es obligatorio.')
      .min(2, msg.nombre.minimo(2))
      .max(150, msg.nombre.maximo(150)),
    codigo: z
      .preprocess(
        (val) => (val === '' || val === undefined ? undefined : val),
        z
          .string({ error: 'El código del estudio debe ser un texto válido.' })
          .trim()
          .min(1, 'El código del estudio no puede estar vacío.')
          .max(150, msg.codigo.maximo(150))
          .optional()
      ),
    observacion: z
      .preprocess(
        (val) => (val === '' || val === undefined ? null : val),
        z
          .string({ error: 'La observación debe ser un texto válido.' })
          .trim()
          .max(1000, msg.observacion.maximo(1000))
          .nullable()
          .optional()
      ),
  })
  .refine((data) => Boolean(data.idPaciente || data.dniPaciente), {
    message: 'Debe especificar el identificador o el DNI del paciente.',
    path: ['dniPaciente'],
  });

export const estudioActualizarSchema = z.object({
  nombre: z
    .string({ error: 'El nombre del estudio debe ser un texto válido.' })
    .trim()
    .min(2, msg.nombre.minimo(2))
    .max(150, msg.nombre.maximo(150))
    .optional(),
  codigo: z
    .preprocess(
      (val) => (val === '' || val === undefined ? undefined : val),
      z
        .string({ error: 'El código del estudio debe ser un texto válido.' })
        .trim()
        .min(1, 'El código del estudio no puede estar vacío.')
        .max(150, msg.codigo.maximo(150))
        .optional()
    ),
  observacion: z
    .preprocess(
      (val) => (val === '' || val === undefined ? null : val),
      z
        .string({ error: 'La observación debe ser un texto válido.' })
        .trim()
        .max(1000, msg.observacion.maximo(1000))
        .nullable()
        .optional()
    ),
  estado: z
    .enum(['ACTIVO', 'INACTIVO'], { error: 'El estado debe ser ACTIVO o INACTIVO.' })
    .optional(),
});

export const cambiarEstadoEstudioSchema = z.object({
  estado: z.enum(['ACTIVO', 'INACTIVO'], { error: 'El estado debe ser ACTIVO o INACTIVO.' }),
});

export type EstudioMedicoInput = z.infer<typeof estudioMedicoSchema>;
export type EstudioAdminCrearInput = z.infer<typeof estudioAdminCrearSchema>;
export type EstudioActualizarInput = z.infer<typeof estudioActualizarSchema>;
export type CambiarEstadoEstudioInput = z.infer<typeof cambiarEstadoEstudioSchema>;
