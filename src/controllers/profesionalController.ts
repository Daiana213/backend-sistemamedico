import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import {
  registrarProfesional,
  listarProfesionales,
  obtenerProfesionalPorId,
  editarProfesional,
  darDeBajaProfesional,
  actualizarObrasSocialesProfesional,
} from '../services/profesionalService';
import { obtenerObrasSocialesAtendidasPorProfesional } from '../services/obraSocialService';
import { AppError } from '../utils/AppError';

export const registrarProfesionalController = asyncHandler(async (req: Request, res: Response) => {
  const idAdministrativo = req.usuario!.idUsuario;
  const ip = req.ip;

  const resultado = await registrarProfesional(req.body, idAdministrativo, ip);
  res.status(201).json(resultado);
});

export const listarProfesionalesController = asyncHandler(async (req: Request, res: Response) => {
  const { especialidad, incluirInactivos } = req.query;
  const idEspecialidad = especialidad ? parseInt(especialidad as string, 10) : undefined;
  const incluir = incluirInactivos === 'true';

  const resultado = await listarProfesionales(idEspecialidad, incluir);
  res.status(200).json(resultado);
});

export const obtenerProfesionalPorIdController = asyncHandler(async (req: Request, res: Response) => {
  const idProfesional = parseInt(req.params.id as string, 10);
  if (isNaN(idProfesional)) {
    throw new AppError('ID de profesional inválido.', 400);
  }

  const resultado = await obtenerProfesionalPorId(idProfesional);
  res.status(200).json(resultado);
});

export const editarProfesionalController = asyncHandler(async (req: Request, res: Response) => {
  const idProfesional = parseInt(req.params.id as string, 10);
  if (isNaN(idProfesional)) {
    throw new AppError('ID de profesional inválido.', 400);
  }

  const idAdministrativo = req.usuario!.idUsuario;
  const resultado = await editarProfesional(idProfesional, req.body, idAdministrativo, req.ip);
  res.status(200).json(resultado);
});

export const darDeBajaProfesionalController = asyncHandler(async (req: Request, res: Response) => {
  const idProfesional = parseInt(req.params.id as string, 10);
  if (isNaN(idProfesional)) {
    throw new AppError('ID de profesional inválido.', 400);
  }

  const idAdministrativo = req.usuario!.idUsuario;
  const resultado = await darDeBajaProfesional(idProfesional, idAdministrativo, req.ip);
  res.status(200).json(resultado);
});


export const listarObrasSocialesProfesionalController = asyncHandler(async (req: Request, res: Response) => {
  const idProfesional = parseInt(req.params.id as string, 10);
  if (isNaN(idProfesional)) {
    throw new AppError('ID de profesional inválido.', 400);
  }
  const obrasSociales = await obtenerObrasSocialesAtendidasPorProfesional(idProfesional);
  res.status(200).json(obrasSociales);
});

export const actualizarObrasSocialesProfesionalController = asyncHandler(async (req: Request, res: Response) => {
  const idProfesional = parseInt(req.params.id as string, 10);
  if (isNaN(idProfesional)) {
    throw new AppError('ID de profesional inválido.', 400);
  }
  const obrasSociales = Array.isArray(req.body?.obrasSociales) ? req.body.obrasSociales.map(Number) : [];
  const idAdministrativo = req.usuario!.idUsuario;
  const resultado = await actualizarObrasSocialesProfesional(idProfesional, obrasSociales, idAdministrativo, req.ip);
  res.status(200).json(resultado);
});
