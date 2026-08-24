import { z } from 'zod';

const MENSAJE_CAMPOS_OBLIGATORIOS = 'Por favor, complete todos los campos obligatorios para continuar.';
const MENSAJE_PASS_INSEGURA = 'La contraseña es insegura, debe tener al menos 8 caracteres';

export const registrarPacienteSchema = z.object({
  nombre: z.string().trim().min(1, MENSAJE_CAMPOS_OBLIGATORIOS),
  apellido: z.string().trim().min(1, MENSAJE_CAMPOS_OBLIGATORIOS),
  dni: z
    .string()
    .regex(/^\d{7,8}$/, MENSAJE_CAMPOS_OBLIGATORIOS),
  telefono: z
    .string()
    .regex(/^\d{8,15}$/, MENSAJE_CAMPOS_OBLIGATORIOS),
  idObraSocial: z.number({ message: MENSAJE_CAMPOS_OBLIGATORIOS }).int().positive(MENSAJE_CAMPOS_OBLIGATORIOS),
  idPlan: z.number({ message: MENSAJE_CAMPOS_OBLIGATORIOS }).int().positive(MENSAJE_CAMPOS_OBLIGATORIOS),
  fechaNacimiento: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, MENSAJE_CAMPOS_OBLIGATORIOS)
    .transform((value) => new Date(`${value}T00:00:00.000Z`))
    .refine((value) => !Number.isNaN(value.getTime()), MENSAJE_CAMPOS_OBLIGATORIOS),
  sexo: z.enum(['MASCULINO', 'FEMENINO', 'OTRO'], { message: MENSAJE_CAMPOS_OBLIGATORIOS }),
  email: z.string().trim().email(MENSAJE_CAMPOS_OBLIGATORIOS),
  // Contraseña segura: mínimo 8 caracteres, una mayúscula, una minúscula y un número
  password: z
    .string()
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, MENSAJE_PASS_INSEGURA),
});

export type RegistrarPacienteInput = z.infer<typeof registrarPacienteSchema>;