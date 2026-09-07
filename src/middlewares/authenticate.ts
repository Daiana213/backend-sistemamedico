import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Acceso denegado. No se proporcionó un token de acceso válido.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    req.usuario = verifyAccessToken(token);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Tu sesión ha expirado. Por favor, iniciá sesión nuevamente.', 401));
    }
    return next(new AppError('Token de acceso inválido. Por favor, iniciá sesión nuevamente.', 401));
  }
}