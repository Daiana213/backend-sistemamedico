import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import {
  listarEspecialidades,
  obtenerEspecialidadPorId,
  crearEspecialidad,
  editarEspecialidad,
  darDeBajaEspecialidad,
} from '../services/especialidadService';

export const listarEspecialidadesController = asyncHandler(async (req: Request, res: Response) => {
  const incluirInactivas = req.query.incluirInactivas === 'true';
  const especialidades = await listarEspecialidades(incluirInactivas);
  res.status(200).json(especialidades);
});

export const obtenerEspecialidadPorIdController = asyncHandler(async (req: Request, res: Response) => {
  const idEspecialidad = parseInt(req.params.id as string, 10);
  if (isNaN(idEspecialidad)) {
    throw new AppError('ID de especialidad inválido.', 400);
  }

  const especialidad = await obtenerEspecialidadPorId(idEspecialidad);
  res.status(200).json(especialidad);
});

export const crearEspecialidadController = asyncHandler(async (req: Request, res: Response) => {
  const idAdministrativo = req.usuario!.idUsuario;
  const resultado = await crearEspecialidad(req.body, idAdministrativo, req.ip);
  res.status(201).json(resultado);
});

export const editarEspecialidadController = asyncHandler(async (req: Request, res: Response) => {
  const idEspecialidad = parseInt(req.params.id as string, 10);
  if (isNaN(idEspecialidad)) {
    throw new AppError('ID de especialidad inválido.', 400);
  }

  const idAdministrativo = req.usuario!.idUsuario;
  const resultado = await editarEspecialidad(idEspecialidad, req.body, idAdministrativo, req.ip);
  res.status(200).json(resultado);
});

export const darDeBajaEspecialidadController = asyncHandler(async (req: Request, res: Response) => {
  const idEspecialidad = parseInt(req.params.id as string, 10);
  if (isNaN(idEspecialidad)) {
    throw new AppError('ID de especialidad inválido.', 400);
  }

  const idAdministrativo = req.usuario!.idUsuario;
  const resultado = await darDeBajaEspecialidad(idEspecialidad, idAdministrativo, req.ip);
  res.status(200).json(resultado);
});
