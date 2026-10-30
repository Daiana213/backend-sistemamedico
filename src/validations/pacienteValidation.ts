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

const parseBooleanOptional = (v: unknown) => {
  if (v === true || v === 'true') return true;
  if (v === false || v === 'false') return false;
  return undefined;
};

export const registrarPacienteSchema = z
  .object({
    nombre: z.string().trim().min(1, 'El nombre es obligatorio.'),
    apellido: z.string().trim().min(1, 'El apellido es obligatorio.'),
    dni: z.string().regex(/^\d{7,8}$/, MENSAJES_TIPO.dni),
    telefono: z.string().regex(/^\d{8,15}$/, MENSAJES_TIPO.telefono),
    tieneObraSocial: z.preprocess(parseBooleanOptional, z.boolean().optional()),
    idObraSocial: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
      z.number({ error: 'Debe seleccionar una obra social válida.' }).int().positive('Debe seleccionar una obra social válida.').optional()
    ),
    idPlan: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
      z.number({ error: msg.plan.seleccionar }).int().positive(msg.plan.seleccionar).optional()
    ),
    numeroAfiliado: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : typeof v === 'string' ? v.trim() : v),
      z.string().min(1, 'El número de afiliado es obligatorio cuando posee obra social.').max(50).optional()
    ),
    subfijoAdherente: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : typeof v === 'string' ? v.trim() : v),
      z.string().max(10, 'El subfijo de adherente no puede superar los 10 caracteres.').optional()
    ),
    vencimientoCredencial: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      z.coerce.date({ error: MENSAJES_TIPO.fecha }).optional()
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

    const declaraObraSocial =
      datos.tieneObraSocial === true ||
      (datos.tieneObraSocial !== false &&
        (Boolean(datos.idObraSocial) ||
          Boolean(datos.idPlan) ||
          Boolean(datos.numeroAfiliado) ||
          Boolean(datos.subfijoAdherente) ||
          Boolean(datos.vencimientoCredencial)));

    if (declaraObraSocial) {
      if (!datos.idObraSocial) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe seleccionar una obra social válida.',
          path: ['idObraSocial'],
        });
      }
      if (!datos.idPlan) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: msg.plan.seleccionar,
          path: ['idPlan'],
        });
      }
      if (!datos.numeroAfiliado) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El número de afiliado es obligatorio cuando posee obra social.',
          path: ['numeroAfiliado'],
        });
      }
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
    tieneObraSocial: z.preprocess(parseBooleanOptional, z.boolean().optional()),
    idObraSocial: z.preprocess(
      (v) => (v === '' ? null : v === null || v === undefined ? v : Number(v)),
      z.number().int().positive('Debe seleccionar una obra social válida.').nullable().optional()
    ),
    idPlan: z.preprocess(
      (v) => (v === '' ? null : v === null || v === undefined ? v : Number(v)),
      z.number().int().positive(msg.plan.seleccionar).nullable().optional()
    ),
    numeroAfiliado: z.preprocess(
      (v) => (v === '' ? null : typeof v === 'string' ? v.trim() : v),
      z.string().min(1, 'El número de afiliado es obligatorio cuando posee obra social.').max(50).nullable().optional()
    ),
    subfijoAdherente: z.preprocess(
      (v) => (v === '' ? null : typeof v === 'string' ? v.trim() : v),
      z.string().max(10, 'El subfijo de adherente no puede superar los 10 caracteres.').nullable().optional()
    ),
    vencimientoCredencial: z.preprocess(
      (v) => (v === '' ? null : v),
      z.coerce.date({ error: MENSAJES_TIPO.fecha }).nullable().optional()
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
  .superRefine((datos, ctx) => {
    const tieneAlgunCampo =
      datos.email !== undefined ||
      datos.sexo !== undefined ||
      datos.tieneObraSocial !== undefined ||
      datos.idObraSocial !== undefined ||
      datos.idPlan !== undefined ||
      datos.numeroAfiliado !== undefined ||
      datos.subfijoAdherente !== undefined ||
      datos.vencimientoCredencial !== undefined ||
      datos.telefono !== undefined ||
      datos.telefonoAlternativo !== undefined ||
      datos.emailAlternativo !== undefined;

    if (!tieneAlgunCampo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe proporcionar al menos un dato para actualizar su perfil.',
      });
      return;
    }

    const declaraObraSocial =
      datos.tieneObraSocial === true ||
      (datos.tieneObraSocial !== false &&
        (Boolean(datos.idObraSocial) ||
          Boolean(datos.idPlan) ||
          Boolean(datos.numeroAfiliado) ||
          Boolean(datos.subfijoAdherente) ||
          Boolean(datos.vencimientoCredencial)));

    if (declaraObraSocial) {
      if (!datos.idObraSocial) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe seleccionar una obra social válida.',
          path: ['idObraSocial'],
        });
      }
      if (!datos.idPlan) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: msg.plan.seleccionar,
          path: ['idPlan'],
        });
      }
      if (!datos.numeroAfiliado) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El número de afiliado es obligatorio cuando posee obra social.',
          path: ['numeroAfiliado'],
        });
      }
    }
  });

export type ActualizarPerfilPacienteInput = z.infer<typeof actualizarPerfilPacienteSchema>;
