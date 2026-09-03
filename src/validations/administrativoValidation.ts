import { z } from 'zod';
import { generarMensajesCampo, MENSAJES_TIPO } from '../utils/validationMessages';

const msg = {
  nombre: generarMensajesCampo('nombre'),
  apellido: generarMensajesCampo('apellido'),
  puesto: generarMensajesCampo('puesto'),
  permisoGestionUsuarios: generarMensajesCampo('permisoGestionUsuarios'),
};

export const registrarAdministrativoSchema = z.object({
  nombre: z.string().trim().min(1, msg.nombre.requerido),
  apellido: z.string().trim().min(1, msg.apellido.requerido),
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