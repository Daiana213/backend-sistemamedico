import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { registrarProfesional } from '../services/profesionalService';

export const registrarProfesionalController = asyncHandler(async (req: Request, res: Response) => {
  const idAdministrativo = req.usuario!.idUsuario;
  const ip = req.ip;

  const resultado = await registrarProfesional(req.body, idAdministrativo, ip);
  res.status(201).json(resultado);
});