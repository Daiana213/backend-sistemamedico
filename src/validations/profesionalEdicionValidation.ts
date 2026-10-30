import { z } from 'zod';

const REGEX_SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;

export const editarProfesionalSchema = z.object({
  nombre: z
    .string({ error: 'El nombre es obligatorio.' })
    .trim()
    .min(1, 'El nombre es obligatorio.')
    .regex(REGEX_SOLO_LETRAS, 'El nombre y el apellido solo pueden contener letras.'),
  apellido: z
    .string({ error: 'El apellido es obligatorio.' })
    .trim()
    .min(1, 'El apellido es obligatorio.')
    .regex(REGEX_SOLO_LETRAS, 'El nombre y el apellido solo pueden contener letras.'),
  telefono: z
    .string({ error: 'El teléfono debe contener entre 8 y 15 dígitos.' })
    .regex(/^\d{8,15}$/, 'El teléfono debe contener entre 8 y 15 dígitos.'),
  email: z
    .string({ error: 'Debe ingresar un correo electrónico con formato válido.' })
    .trim()
    .email('Debe ingresar un correo electrónico con formato válido.'),
  telefonoAlternativo: z
    .string()
    .regex(/^\d{8,15}$/, 'El teléfono debe contener entre 8 y 15 dígitos.')
    .optional()
    .nullable(),
  emailAlternativo: z
    .string()
    .trim()
    .email('Debe ingresar un correo electrónico con formato válido.')
    .optional()
    .nullable(),
  especialidades: z
    .array(z.number().int().positive())
    .min(1, 'Debe asignarse al menos una especialidad.'),
  obrasSociales: z
    .array(z.number().int().positive())
    .optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO']).optional(),
});

export type EditarProfesionalInput = z.infer<typeof editarProfesionalSchema>;
