import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import * as consultaService from '../services/consultaService';

export const registrarConsulta = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }

  const { idTurno, motivoConsulta, diagnostico, tratamiento, notasAdicionales } = req.body;

  if (!idTurno || !motivoConsulta || !diagnostico || !tratamiento) {
    throw new AppError('Por favor, complete todos los campos obligatorios para continuar.', 400);
  }

  const resultado = await consultaService.registrarConsulta(
    { idTurno, motivoConsulta, diagnostico, tratamiento, notasAdicionales },
    req.usuario
  );

  res.status(201).json({ mensaje: 'Consulta registrada con éxito.', data: resultado });
});
