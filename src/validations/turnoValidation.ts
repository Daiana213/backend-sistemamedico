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
});

export type CrearTurnoInput = z.infer<typeof crearTurnoSchema>;
