import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as pacienteService from '../services/pacienteService';

export const registrar = asyncHandler(async (req: Request, res: Response) => {
  const resultado = await pacienteService.registrarPaciente(req.body);
  res.status(201).json(resultado);
});