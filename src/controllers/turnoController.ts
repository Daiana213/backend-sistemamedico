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

export const crearTurnoPorProfesional = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado.', 401);
  }

  const { idPaciente, fechaHora } = req.body;

  if (!idPaciente || !fechaHora) {
    throw new AppError('Debe especificar idPaciente y fechaHora.', 400);
  }

  const idPacienteNumber = parseInt(idPaciente, 10);
  if (isNaN(idPacienteNumber)) {
    throw new AppError('ID de paciente inválido', 400);
  }

  const resultado = await turnoService.crearTurnoPorProfesional(
    { idPaciente: idPacienteNumber, fechaHora },
    req.usuario
  );
  res.status(201).json(resultado);
});

export const listar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión para ver los turnos.', 401);
  }

  const resultado = await turnoService.listarTurnos(req.usuario);
  res.status(200).json(resultado);
});

export const cancelar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado.', 401);
  }
  const idTurno = parseInt(req.params.id as string, 10);
  if (isNaN(idTurno)) {
    throw new AppError('ID de turno inválido', 400);
  }

  const resultado = await turnoService.cancelarTurno(idTurno, req.usuario);
  res.status(200).json(resultado);
});

export const reprogramar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado.', 401);
  }
  const idTurno = parseInt(req.params.id as string, 10);
  if (isNaN(idTurno)) {
    throw new AppError('ID de turno inválido', 400);
  }
  
  const { fechaHora } = req.body;
  if (!fechaHora) {
    throw new AppError('Se requiere la nueva fechaHora', 400);
  }

  const nuevaFecha = new Date(fechaHora);
  if (isNaN(nuevaFecha.getTime())) {
    throw new AppError('Formato de fechaHora inválido', 400);
  }

  const resultado = await turnoService.reprogramarTurno(idTurno, nuevaFecha, req.usuario);
  res.status(200).json(resultado);
});
