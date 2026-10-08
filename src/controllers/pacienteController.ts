import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
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

export const obtenerPerfil = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }

  const resultado = await pacienteService.obtenerPerfilPaciente(req.usuario.idUsuario);
  res.status(200).json(resultado);
});

export const actualizarPerfil = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }

  const resultado = await pacienteService.actualizarPerfilPaciente(req.usuario.idUsuario, req.body);
  res.status(200).json(resultado);
});

export const buscarPorDni = asyncHandler(async (req: Request, res: Response) => {
  const { dni } = req.query;

  if (!dni || typeof dni !== 'string') {
    throw new AppError('Debe proporcionar el DNI del paciente a buscar.', 400);
  }

  const resultado = await pacienteService.buscarPacientePorDni(dni);
  res.status(200).json(resultado);
});