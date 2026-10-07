import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { registrarProfesional, listarProfesionales } from '../services/profesionalService';

export const registrarProfesionalController = asyncHandler(async (req: Request, res: Response) => {
  const idAdministrativo = req.usuario!.idUsuario;
  const ip = req.ip;

  const resultado = await registrarProfesional(req.body, idAdministrativo, ip);
  res.status(201).json(resultado);
});

export const listarProfesionalesController = asyncHandler(async (req: Request, res: Response) => {
  const { especialidad } = req.query;
  const idEspecialidad = especialidad ? parseInt(especialidad as string, 10) : undefined;

  const resultado = await listarProfesionales(idEspecialidad);
  res.status(200).json(resultado);
});