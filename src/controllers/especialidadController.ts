import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { listarEspecialidades } from '../services/especialidadService';

export const listarEspecialidadesController = asyncHandler(async (_req: Request, res: Response) => {
  const especialidades = await listarEspecialidades();
  res.json(especialidades);
});
