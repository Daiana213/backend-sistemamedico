import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import * as turnoService from '../services/turnoService';

export const crear = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión para solicitar un turno.', 401);
  }

  const resultado = await turnoService.crearTurno(req.body, req.usuario);
  res.status(201).json(resultado);
});

export const listar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión para ver los turnos.', 401);
  }

  const resultado = await turnoService.listarTurnos(req.usuario);
  res.status(200).json(resultado);
});
