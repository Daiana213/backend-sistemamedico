import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as administrativoService from '../services/administrativoService';

export const registrar = asyncHandler(async (req: Request, res: Response) => {
  const idUsuarioCreador = req.usuario!.idUsuario;
  const resultado = await administrativoService.registrarAdministrativo(req.body, idUsuarioCreador);
  res.status(201).json(resultado);
});