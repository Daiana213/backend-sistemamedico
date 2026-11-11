import { z } from 'zod';
import { generarMensajesCampo, MENSAJES_TIPO } from '../utils/validationMessages';

const msg = {
  nombre: generarMensajesCampo('nombre'),
  apellido: generarMensajesCampo('apellido'),
  puesto: generarMensajesCampo('puesto'),
  permisoGestionUsuarios: generarMensajesCampo('permisoGestionUsuarios'),
};

export const registrarAdministrativoSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.'),
  apellido: z.string().trim().min(1, 'El apellido es obligatorio.'),
  dni: z.string().regex(/^\d{7,8}$/, MENSAJES_TIPO.dni),
  puesto: z.string().trim().min(1, msg.puesto.requerido),
  telefono: z.string().regex(/^\d{8,15}$/, MENSAJES_TIPO.telefono),
  email: z.string().trim().email(MENSAJES_TIPO.email),
  password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, MENSAJES_TIPO.password).optional(),
  permisoGestionUsuarios: z.boolean({
    error: () => ({ message: msg.permisoGestionUsuarios.boolean || msg.permisoGestionUsuarios.requerido }),
  }),
  // Opcionales — solo cuando el usuario ya existe con otro rol
  telefonoAlternativo: z.string().regex(/^\d{8,15}$/, MENSAJES_TIPO.telefono).optional(),
  emailAlternativo: z.string().trim().email(MENSAJES_TIPO.email).optional(),
});

export type RegistrarAdministrativoInput = z.infer<typeof registrarAdministrativoSchema>;

export const actualizarAdministrativoSchema = z
  .object({
    puesto: z
      .string({ error: 'El puesto debe ser una cadena de texto.' })
      .trim()
      .min(1, 'El puesto no puede estar vacío.')
      .max(100, 'El puesto no puede exceder los 100 caracteres.')
      .optional(),
    permisoGestionUsuarios: z
      .boolean({
        error: () => ({ message: 'El permiso de gestión debe ser un valor booleano.' }),
      })
      .optional(),
    estado: z
      .enum(['ACTIVO', 'INACTIVO'], {
        error: () => ({ message: 'El estado debe ser ACTIVO o INACTIVO.' }),
      })
      .optional(),
  })
  .refine(
    (datos) =>
      datos.puesto !== undefined ||
      datos.permisoGestionUsuarios !== undefined ||
      datos.estado !== undefined,
    { message: 'Debe enviar al menos un campo para actualizar.' }
  );

export type ActualizarAdministrativoInput = z.infer<typeof actualizarAdministrativoSchema>;