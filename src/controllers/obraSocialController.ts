import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import {
  listarObrasSocialesActivas,
  listarPlanesActivosPorObraSocial,
} from '../services/obraSocialService';

export const listarObrasSociales = asyncHandler(async (req: Request, res: Response) => {
  const obrasSociales = await listarObrasSocialesActivas();
  res.status(200).json(obrasSociales);
});

export const listarPlanesPorObraSocial = asyncHandler(async (req: Request, res: Response) => {
  const idObraSocial = Number.parseInt(
    Array.isArray(req.params.idObraSocial) ? req.params.idObraSocial[0] : req.params.idObraSocial,
    10
  );

  if (Number.isNaN(idObraSocial)) {
    throw new AppError('ID de obra social inválido.', 400);
  }

  const planes = await listarPlanesActivosPorObraSocial(idObraSocial);
  res.status(200).json(planes);
});
