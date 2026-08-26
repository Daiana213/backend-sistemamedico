import type { Administrativo } from '@prisma/client';
import type { AccessTokenPayload } from '../../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      usuario?: AccessTokenPayload;
      administrativo?: Administrativo;
    }
  }
}

export {};