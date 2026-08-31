import { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client-runtime-utils';
import { AppError } from '../utils/AppError';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // 1. Errores de negocio que nosotros mismos lanzamos
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // 2. Errores conocidos de Prisma (violaciones de constraint, etc.)
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Unique constraint violation (ej. dni o email duplicado)
      const campo = (err.meta?.target as string[])?.join(', ') ?? 'campo';
      return res.status(409).json({
        error: `Ya existe un registro con ese ${campo}`,
      });
    }
    if (err.code === 'P2025') {
      // Registro no encontrado (ej. update/delete sobre id inexistente)
      return res.status(404).json({
        error: 'Registro no encontrado',
      });
    }
    if (err.code === 'P2003') {
      // Foreign key constraint (ej. id_plan que no existe)
      return res.status(400).json({
        error: 'Referencia inválida: el registro relacionado no existe',
      });
    }
  }

  // 3. Cualquier otra cosa: bug inesperado, no confiamos en exponer el mensaje
  console.error('[ERROR NO CONTROLADO]', err);
  return res.status(500).json({
    error: 'Ocurrió un error interno. Intentá nuevamente más tarde.',
  });
}