import { z } from 'zod';
import { generarMensajesCampo, MENSAJES_TIPO } from '../utils/validationMessages';

const msg = {
  dni: generarMensajesCampo('dni'),
  nombre: generarMensajesCampo('nombre'),
  apellido: generarMensajesCampo('apellido'),
  telefono: generarMensajesCampo('telefono'),
  email: generarMensajesCampo('email'),
  matricula: generarMensajesCampo('matricula'),
  especialidades: generarMensajesCampo('especialidades'),
};

export const registrarProfesionalSchema = z.object({
  dni: z
    .string({ message: msg.dni.requerido })
    .min(1, msg.dni.requerido)
    .regex(/^\d{7,8}$/, MENSAJES_TIPO.dni),
  nombre: z
    .string({ message: msg.nombre.requerido })
    .min(1, msg.nombre.requerido),
  apellido: z
    .string({ message: msg.apellido.requerido })
    .min(1, msg.apellido.requerido),
  telefono: z
    .string({ message: msg.telefono.requerido })
    .min(1, msg.telefono.requerido)
    .regex(/^\d{8,15}$/, MENSAJES_TIPO.telefono),
  email: z
    .string({ message: msg.email.requerido })
    .min(1, msg.email.requerido)
    .email(MENSAJES_TIPO.email),
  matricula: z
    .string({ message: msg.matricula.requerido })
    .min(1, msg.matricula.requerido),
  especialidades: z
    .array(z.number({ message: msg.especialidades.numero }))
    .min(1, 'Debe asignarse al menos una especialidad.'),
  telefonoAlternativo: z.string().regex(/^\d{8,15}$/, MENSAJES_TIPO.telefono).optional(),
  emailAlternativo: z.string().trim().email(MENSAJES_TIPO.email).optional(),
});

export type RegistrarProfesionalInput = z.infer<typeof registrarProfesionalSchema>;