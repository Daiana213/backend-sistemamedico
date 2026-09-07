import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/AppError';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const isLogin = req.originalUrl.includes('/login');
      if (isLogin) {
        return next(new AppError('Credenciales inválidas. Por favor, intente nuevamente.', 401));
      }

      const details = result.error.issues.reduce((acc: Record<string, string>, issue) => {
        const key = issue.path.join('.') || 'general';
        acc[key] = issue.message;
        return acc;
      }, {});
      
      const primerMensaje = result.error.issues[0]?.message || 'Error de validación';
      return next(new AppError(primerMensaje, 400, details));
    }

    req.body = result.data;
    next();
  };
}