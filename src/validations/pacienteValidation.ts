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
    nombre: z.string().trim().min(1, 'El nombre es obligatorio.'),
    apellido: z.string().trim().min(1, 'El apellido es obligatorio.'),
    dni: z.string().regex(/^\d{7,8}$/, MENSAJES_TIPO.dni),
    telefono: z.string().regex(/^\d{8,15}$/, MENSAJES_TIPO.telefono),
    idObraSocial: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
      z.number({ error: 'Debe seleccionar una obra social válida.' }).int().positive('Debe seleccionar una obra social válida.').optional()
    ),
    idPlan: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
      z.number({ error: msg.plan.seleccionar }).int().positive(msg.plan.seleccionar).optional()
    ),
    fechaNacimiento: z.coerce.date({ error: MENSAJES_TIPO.fecha }),
    sexo: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      z.enum(['MASCULINO', 'FEMENINO', 'OTRO'], { error: MENSAJES_TIPO.sexo }).optional()
    ),
    email: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : typeof v === 'string' ? v.trim() : v),
      z.string().email(MENSAJES_TIPO.email).optional()
    ),
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
    }

    if ((datos.idPlan && !datos.idObraSocial) || (!datos.idPlan && datos.idObraSocial)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Si selecciona una obra social o un plan, debe indicar ambos.',
        path: [datos.idPlan ? 'idObraSocial' : 'idPlan'],
      });
    }
  });

export type RegistrarPacienteInput = z.infer<typeof registrarPacienteSchema>;

export const actualizarPerfilPacienteSchema = z
  .object({
    email: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : typeof v === 'string' ? v.trim() : v),
      z.string().email(MENSAJES_TIPO.email).optional()
    ),
    sexo: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      z.enum(['MASCULINO', 'FEMENINO', 'OTRO'], { error: MENSAJES_TIPO.sexo }).optional()
    ),
    idObraSocial: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
      z.number().int().positive('Debe seleccionar una obra social válida.').optional()
    ),
    idPlan: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
      z.number().int().positive(msg.plan.seleccionar).optional()
    ),
    telefono: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      z.string().regex(/^\d{8,15}$/, MENSAJES_TIPO.telefono).optional()
    ),
    telefonoAlternativo: z.preprocess(
      (v) => (v === '' || v === undefined ? null : v),
      z
        .string()
        .trim()
        .regex(/^\d{8,15}$/, MENSAJES_TIPO.telefono)
        .nullable()
        .optional()
    ),
    emailAlternativo: z.preprocess(
      (v) => (v === '' || v === undefined ? null : typeof v === 'string' ? v.trim() : v),
      z
        .string()
        .trim()
        .email(MENSAJES_TIPO.email)
        .nullable()
        .optional()
    ),
  })
  .refine(
    (datos) =>
      datos.email !== undefined ||
      datos.sexo !== undefined ||
      datos.idPlan !== undefined ||
      datos.telefono !== undefined ||
      datos.telefonoAlternativo !== undefined ||
      datos.emailAlternativo !== undefined,
    {
      message: 'Debe proporcionar al menos un dato para actualizar su perfil.',
    }
  );

export type ActualizarPerfilPacienteInput = z.infer<typeof actualizarPerfilPacienteSchema>;