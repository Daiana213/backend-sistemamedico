import { Request, Response, NextFunction } from 'express';
import { RolActivo } from '../utils/jwt';
import { AppError } from '../utils/AppError';

export function authorize(...rolesPermitidos: RolActivo[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return next(new AppError('No autorizado. Debe iniciar sesión para continuar.', 401));
    }

    if (!rolesPermitidos.includes(req.usuario.rolActivo)) {
      return next(new AppError('Acceso denegado. No tenés los permisos necesarios para realizar esta acción.', 403));
    }

    next();
  };
}