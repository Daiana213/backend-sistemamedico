import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as pacienteService from '../services/pacienteService';

export const registrar = asyncHandler(async (req: Request, res: Response) => {
  const archivo = req.file
    ? {
        nombreArchivo: req.file.originalname,
        rutaArchivo: req.file.path,
      }
    : undefined;

  const resultado = await pacienteService.registrarPaciente(req.body, archivo);
  res.status(201).json(resultado);
});