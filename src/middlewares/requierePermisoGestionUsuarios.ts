import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

export async function requierePermisoGestionUsuarios(
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

    // Escenario 2: bloquea si no es administrativo, si está inactivo,
    // o si no tiene el permiso específico habilitado
    if (
      !administrativo ||
      administrativo.estado !== 'ACTIVO' ||
      !administrativo.permisoGestionUsuarios
    ) {
      throw new AppError('No tenés permisos para acceder a esta funcionalidad.', 403);
    }

    req.administrativo = administrativo;
    next();
  } catch (error) {
    next(error);
  }
}