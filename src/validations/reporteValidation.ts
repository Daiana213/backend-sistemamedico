import { z } from 'zod';

const FORMATO_FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const filtroMetricasQuerySchema = z
  .object({
    periodo: z
      .enum(['mes_actual', 'ultimos_30_dias', 'personalizado'])
      .optional()
      .default('mes_actual'),
    fechaInicio: z
      .string()
      .regex(FORMATO_FECHA_REGEX, 'fechaInicio debe tener formato YYYY-MM-DD')
      .optional(),
    fechaFin: z
      .string()
      .regex(FORMATO_FECHA_REGEX, 'fechaFin debe tener formato YYYY-MM-DD')
      .optional(),
    idEspecialidad: z
      .string()
      .regex(/^\d+$/, 'idEspecialidad debe ser un número entero válido')
      .transform(Number)
      .optional(),
    idProfesional: z
      .string()
      .regex(/^\d+$/, 'idProfesional debe ser un número entero válido')
      .transform(Number)
      .optional(),
  })
  .refine(
    (data) => {
      if (data.periodo === 'personalizado' && (!data.fechaInicio || !data.fechaFin)) {
        return false;
      }
      return true;
    },
    {
      message: 'Para un período personalizado debe especificar fechaInicio y fechaFin.',
      path: ['fechaInicio'],
    }
  );

export const generarReporteBodySchema = z.object({
  periodo: z
    .enum(['mes_actual', 'mes_anterior', 'ultimos_30_dias', 'personalizado'])
    .optional()
    .default('mes_actual'),
  fechaInicio: z
    .string()
    .regex(FORMATO_FECHA_REGEX, 'fechaInicio debe tener formato YYYY-MM-DD')
    .optional(),
  fechaFin: z
    .string()
    .regex(FORMATO_FECHA_REGEX, 'fechaFin debe tener formato YYYY-MM-DD')
    .optional(),
  idEspecialidad: z.number().int().positive().optional(),
  idProfesional: z.number().int().positive().optional(),
});

export type FiltroMetricasQuery = z.infer<typeof filtroMetricasQuerySchema>;
export type GenerarReporteInput = z.infer<typeof generarReporteBodySchema>;
