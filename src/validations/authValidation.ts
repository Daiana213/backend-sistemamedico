import { z } from 'zod';
import { generarMensajesCampo, MENSAJES_TIPO } from '../utils/validationMessages';

const msg = {
  dni: generarMensajesCampo('dni'),
  password: generarMensajesCampo('password'),
  confirmarPassword: generarMensajesCampo('confirmarPassword'),
  email: generarMensajesCampo('email'),
  token: generarMensajesCampo('token'),
  preSessionToken: generarMensajesCampo('preSessionToken'),
  rol: generarMensajesCampo('rol'),
  refreshToken: generarMensajesCampo('refreshToken'),
};

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const loginSchema = z.object({
  dni: z.string().regex(/^\d{7,8}$/, MENSAJES_TIPO.dni),
  password: z.string().min(1, msg.password.requerido),
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

export const solicitarRecuperacionSchema = z.object({
  dni: z.string().regex(/^\d{7,8}$/, MENSAJES_TIPO.dni),
  email: z.string().email(MENSAJES_TIPO.email),
});

export const restablecerPasswordSchema = z
  .object({
    token: z.string().min(1, msg.token.requerido),
    password: z
      .string()
      .min(8, msg.password.minimo(8))
      .regex(PASSWORD_REGEX, MENSAJES_TIPO.password),
    confirmarPassword: z.string().min(1, msg.confirmarPassword.requerido),
  })
  .refine((data) => data.password === data.confirmarPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmarPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SeleccionarRolInput = z.infer<typeof seleccionarRolSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type SolicitarRecuperacionInput = z.infer<typeof solicitarRecuperacionSchema>;
export type RestablecerPasswordInput = z.infer<typeof restablecerPasswordSchema>;

export const cambiarPasswordSchema = z
  .object({
    passwordActual: z.string().min(1, 'La contraseña actual es obligatoria.'),
    nuevoPassword: z
      .string()
      .min(8, msg.password.minimo(8))
      .regex(PASSWORD_REGEX, MENSAJES_TIPO.password),
    confirmarPassword: z.string().min(1, msg.confirmarPassword.requerido),
  })
  .refine((data) => data.nuevoPassword === data.confirmarPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmarPassword'],
  })
  .refine((data) => data.passwordActual !== data.nuevoPassword, {
    message: 'La nueva contraseña no puede ser igual a la actual.',
    path: ['nuevoPassword'],
  });

export type CambiarPasswordInput = z.infer<typeof cambiarPasswordSchema>;