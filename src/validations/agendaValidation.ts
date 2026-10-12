import { z } from 'zod';

export const agendaItemSchema = z.object({
  diaSemana: z.number().int().min(0).max(6, 'Día de la semana inválido'),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:mm)'),
  horaFin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:mm)'),
  duracionTurnoMinutos: z.number().int().positive('La duración debe ser mayor a 0').default(30),
}).refine(data => {
  const [hInicio, mInicio] = data.horaInicio.split(':').map(Number);
  const [hFin, mFin] = data.horaFin.split(':').map(Number);
  return (hFin * 60 + mFin) > (hInicio * 60 + mInicio);
}, {
  message: "La hora de fin debe ser posterior a la hora de inicio",
  path: ["horaFin"],
});

export const configurarAgendaSchema = z.object({
  agendas: z.array(agendaItemSchema).min(1, 'Debe proporcionar al menos una franja horaria')
});

export type ConfigurarAgendaDTO = z.infer<typeof configurarAgendaSchema>;
