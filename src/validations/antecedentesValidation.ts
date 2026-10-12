import { z } from 'zod';

const GRUPOS_SANGUINEOS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "0+", "0-"] as const;

export const antecedentesMedicosSchema = z.object({
  alergias: z.string().optional().nullable(),
  enfermedadesCronicas: z.string().optional().nullable(),
  grupoSanguineo: z.enum(GRUPOS_SANGUINEOS, {
    message: 'El grupo sanguíneo no es válido.',
  }).optional().nullable(),
});
