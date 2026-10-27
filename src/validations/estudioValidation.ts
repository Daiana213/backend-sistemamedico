import { z } from 'zod';
import { generarMensajesCampo } from '../utils/validationMessages';

const msg = {
  nombre: generarMensajesCampo('nombre del estudio'),
  codigo: generarMensajesCampo('código del estudio'),
  observacion: generarMensajesCampo('observación'),
};

export const estudioMedicoSchema = z.object({
  nombre: z
    .string({ error: 'El nombre del estudio es obligatorio.' })
    .trim()
    .min(1, 'El nombre del estudio es obligatorio.')
    .min(2, msg.nombre.minimo(2))
    .max(150, msg.nombre.maximo(150)),
  codigo: z
    .string({ error: 'El código del estudio es obligatorio.' })
    .trim()
    .min(1, 'El código del estudio es obligatorio.')
    .max(150, msg.codigo.maximo(150)),
  observacion: z
    .preprocess(
      (val) => (val === '' || val === undefined ? null : val),
      z
        .string({ error: 'La observación debe ser un texto válido.' })
        .trim()
        .max(1000, msg.observacion.maximo(1000))
        .nullable()
        .optional()
    ),
});

export type EstudioMedicoInput = z.infer<typeof estudioMedicoSchema>;
