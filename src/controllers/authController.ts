import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as authService from '../services/authService';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const resultado = await authService.login(req.body);
  res.status(200).json(resultado);
});

export const seleccionarRol = asyncHandler(async (req: Request, res: Response) => {
  const resultado = await authService.seleccionarRol(req.body);
  res.status(200).json(resultado);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const resultado = await authService.refresh(req.body.refreshToken);
  res.status(200).json(resultado);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.body.refreshToken);
  res.status(200).json({ mensaje: 'Sesión cerrada correctamente' });
});

export const solicitarRecuperacionPassword = asyncHandler(async (req: Request, res: Response) => {
  const resultado = await authService.solicitarRecuperacionPassword(req.body);
  res.status(200).json(resultado);
});

export const restablecerPassword = asyncHandler(async (req: Request, res: Response) => {
  const resultado = await authService.restablecerPassword(req.body);
  res.status(200).json(resultado);
});

export const cambiarPassword = asyncHandler(async (req: Request, res: Response) => {
  const idUsuario = req.usuario!.idUsuario;
  const resultado = await authService.cambiarPassword(idUsuario, req.body);
  res.status(200).json(resultado);
});