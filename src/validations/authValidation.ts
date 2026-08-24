import { z } from 'zod';

export const loginSchema = z.object({
  dni: z.string().regex(/^\d{7,8}$/, 'El DNI debe contener solo números, sin puntos (7 u 8 dígitos)'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const seleccionarRolSchema = z.object({
  preSessionToken: z.string().min(1, 'Falta el token de pre-sesión'),
  rol: z.enum(['PACIENTE', 'PROFESIONAL', 'ADMINISTRATIVO']),
});
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Falta el refresh token'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Falta el refresh token'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SeleccionarRolInput = z.infer<typeof seleccionarRolSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;