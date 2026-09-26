import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/AppError';

export interface ValidateOptions {
  customMessage?: string;
  statusCode?: number;
}

export function validate(schema: ZodSchema, options?: ValidateOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      if (options?.customMessage) {
        return next(new AppError(options.customMessage, options.statusCode || 400));
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