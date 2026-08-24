import { Request, Response, NextFunction } from 'express';
import { RolActivo } from '../utils/jwt';
import { AppError } from '../utils/AppError';

export function authorize(...rolesPermitidos: RolActivo[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return next(new AppError('No autenticado', 401));
    }

    if (!rolesPermitidos.includes(req.usuario.rolActivo)) {
      return next(new AppError('No tenés permisos para acceder a este recurso', 403));
    }

    next();
  };
}