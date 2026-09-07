import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/AppError';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.reduce((acc: Record<string, string>, issue) => {
        const key = issue.path.join('.') || 'general';
        acc[key] = issue.message;
        return acc;
      }, {});
      return next(new AppError('Por favor, complete todos los campos obligatorios para continuar', 400, details));
    }

    req.body = result.data;
    next();
  };
}