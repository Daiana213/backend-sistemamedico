import { z } from 'zod';

export const especialidadSchema = z.object({
  nombre: z
    .string({ error: 'El nombre de la especialidad es obligatorio.' })
    .trim()
    .min(2, 'El nombre de la especialidad debe tener al menos 2 caracteres.')
    .max(100, 'El nombre no puede superar los 100 caracteres.'),
  descripcion: z
    .string()
    .trim()
    .max(255, 'La descripción no puede superar los 255 caracteres.')
    .optional()
    .nullable(),
});

export type EspecialidadInput = z.infer<typeof especialidadSchema>;
