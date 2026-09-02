import { z } from 'zod';
import { calcularEdad } from '../utils/edad';
import { generarMensajesCampo, MENSAJES_TIPO } from '../utils/validationMessages';

const msg = {
  nombre: generarMensajesCampo('nombre'),
  apellido: generarMensajesCampo('apellido'),
  obraSocial: generarMensajesCampo('obraSocial'),
  plan: generarMensajesCampo('plan'),
  fechaNacimiento: generarMensajesCampo('fechaNacimiento'),
  sexo: generarMensajesCampo('sexo'),
  dniResponsable: generarMensajesCampo('dniResponsable'),
  parentesco: generarMensajesCampo('parentesco'),
  tipoDocumento: generarMensajesCampo('tipoDocumento'),
};

export const registrarPacienteSchema = z
  .object({
    nombre: z.string().trim().min(1, msg.nombre.requerido),
    apellido: z.string().trim().min(1, msg.apellido.requerido),
    dni: z.string().regex(/^\d{7,8}$/, MENSAJES_TIPO.dni),
    telefono: z.string().regex(/^\d{8,15}$/, MENSAJES_TIPO.telefono),
    idObraSocial: z.coerce.number({ error: msg.obraSocial.seleccionar }).int().positive(msg.obraSocial.seleccionar),
    idPlan: z.coerce.number({ error: msg.plan.seleccionar }).int().positive(msg.plan.seleccionar),
    fechaNacimiento: z.coerce.date({ error: MENSAJES_TIPO.fecha }),
    sexo: z.enum(['MASCULINO', 'FEMENINO', 'OTRO'], { error: MENSAJES_TIPO.sexo }),
    email: z.string().trim().email(MENSAJES_TIPO.email),
    password: z
      .string()
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, MENSAJES_TIPO.password),

    // Campos del adulto responsable — solo obligatorios si el paciente es menor
    dniResponsable: z.string().regex(/^\d{7,8}$/, MENSAJES_TIPO.dni).optional(),
    parentesco: z.string().trim().min(1, msg.parentesco.requerido).optional(),
    tipoDocumento: z
      .enum(['PARTIDA_NACIMIENTO', 'LIBRETA_MATRIMONIO', 'SENTENCIA_ADOPCION'], {
        error: msg.tipoDocumento.seleccionar,
      })
      .optional(),
    documentoUuid: z.string().trim().min(1, 'Debe adjuntar el documento del adulto responsable.').optional(),
    documentoNombre: z.string().trim().min(1).optional(),
    telefonoAlternativo: z.string().regex(/^\d{8,15}$/, MENSAJES_TIPO.telefono).optional(),
    emailAlternativo: z.string().trim().email(MENSAJES_TIPO.email).optional(),
  })
  .superRefine((datos, ctx) => {
    const esMenor = calcularEdad(datos.fechaNacimiento) < 18;

    if (esMenor) {
      if (!datos.dniResponsable) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: MENSAJES_TIPO.dni, path: ['dniResponsable'] });
      }
      if (!datos.parentesco) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg.parentesco.requerido, path: ['parentesco'] });
      }
      if (!datos.tipoDocumento) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg.tipoDocumento.seleccionar, path: ['tipoDocumento'] });
      }
      if (!datos.documentoUuid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe adjuntar el documento del adulto responsable.',
          path: ['documentoUuid'],
        });
      }
    }
  });

export type RegistrarPacienteInput = z.infer<typeof registrarPacienteSchema>;