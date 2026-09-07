import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

export async function requiereAdminActivo(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const idUsuario = req.usuario?.idUsuario;

    if (!idUsuario) {
      throw new AppError('No autenticado.', 401);
    }

    const administrativo = await prisma.administrativo.findUnique({
      where: { idUsuario },
    });

    if (!administrativo || administrativo.estado !== 'ACTIVO') {
      throw new AppError('No tenés permisos para acceder a esta funcionalidad.', 403);
    }

    req.administrativo = administrativo;
    next();
  } catch (error) {
    next(error);
  }
}
