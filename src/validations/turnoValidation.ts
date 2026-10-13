import { z } from 'zod';
import { MENSAJES_TIPO } from '../utils/validationMessages';

export const crearTurnoSchema = z.object({
  idProfesional: z.coerce
    .number({ error: 'Debe seleccionar un profesional válido.' })
    .int('El identificador del profesional debe ser un número entero.')
    .positive('Debe seleccionar un profesional válido.'),
  fechaHora: z.coerce
    .date({ error: MENSAJES_TIPO.fecha })
    .refine((fecha) => fecha.getTime() > Date.now(), {
      message: 'La fecha y hora del turno debe ser posterior a la fecha y hora actual.',
    }),
  idPaciente: z.coerce
    .number()
    .int('El identificador del paciente debe ser un número entero.')
    .positive('El identificador del paciente debe ser positivo.')
    .optional(),
  dniPaciente: z
    .string()
    .regex(/^\d{7,8}$/, 'El DNI debe contener entre 7 y 8 números.')
    .optional(),
});

export const reprogramarTurnoAdminSchema = z.object({
  nuevaFechaHora: z.coerce.date({ error: 'Debe ingresar una fecha y hora válida.' }),
  motivo: z.string().optional(),
});

export const cancelarTurnoAdminSchema = z.object({
  motivoCancelacion: z.string().optional(),
});

export type CrearTurnoInput = z.infer<typeof crearTurnoSchema>;
export type ReprogramarTurnoAdminInput = z.infer<typeof reprogramarTurnoAdminSchema>;
export type CancelarTurnoAdminInput = z.infer<typeof cancelarTurnoAdminSchema>;
