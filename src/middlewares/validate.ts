import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/AppError';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const mensaje = result.error.issues.map((i) => i.message).join('; ');
      return next(new AppError(mensaje, 400));
    }

    req.body = result.data;
    next();
  };
}