import { AccessTokenPayload } from '../../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      usuario?: AccessTokenPayload;
    }
  }
}

export {};