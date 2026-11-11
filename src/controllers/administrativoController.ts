import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import * as administrativoService from '../services/administrativoService';

export const registrar = asyncHandler(async (req: Request, res: Response) => {
  const idUsuarioCreador = req.usuario!.idUsuario;
  const resultado = await administrativoService.registrarAdministrativo(req.body, idUsuarioCreador);
  res.status(201).json(resultado);
});

export const listar = asyncHandler(async (_req: Request, res: Response) => {
  const administrativos = await administrativoService.listarAdministrativos();
  res.status(200).json({ administrativos });
});

export const actualizar = asyncHandler(async (req: Request, res: Response) => {
  const idAdministrativo = Number(req.params.id);
  if (!Number.isInteger(idAdministrativo) || idAdministrativo <= 0) {
    throw new AppError('ID de administrativo inválido.', 400);
  }

  const idUsuarioOperador = req.usuario!.idUsuario;
  const ip = req.ip;

  const resultado = await administrativoService.actualizarAdministrativo(
    idAdministrativo,
    req.body,
    idUsuarioOperador,
    ip
  );
  res.status(200).json(resultado);
});