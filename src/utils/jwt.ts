import jwt, { SignOptions } from 'jsonwebtoken';
import { generarTokenSeguro } from './crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';
const PRESESSION_EXPIRES_IN = '5m';

export type RolActivo = 'PACIENTE' | 'PROFESIONAL' | 'ADMINISTRATIVO';

export interface AccessTokenPayload {
  idUsuario: number;
  rolActivo: RolActivo;
  idRolEspecifico: number; // idPaciente | idProfesional | idAdministrativo
  permisos?: string[];     // solo relevante si rolActivo === 'ADMINISTRATIVO'
  primerLogin?: boolean;
}

export interface RefreshTokenPayload {
  idUsuario: number;
  rolActivo?: RolActivo;
  jti?: string;
}

export interface PreSessionTokenPayload {
  idUsuario: number;
}

function sign<T extends object>(payload: T, secret: string, expiresIn?: string): string {
  const options: SignOptions = {};
  if (expiresIn) {
    options.expiresIn = expiresIn as SignOptions['expiresIn'];
  }
  return jwt.sign(payload, secret, options);
}

// ---------- Access token ----------

export function signAccessToken(payload: AccessTokenPayload): string {
  // Para los profesionales de la salud, la sesión no expira
  // para permitir la atención continua y turnos durante toda la jornada laboral
  if (payload.rolActivo === 'PROFESIONAL') {
    return sign(payload, ACCESS_SECRET);
  }
  return sign(payload, ACCESS_SECRET, ACCESS_EXPIRES_IN);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

// ---------- Refresh token ----------

export function signRefreshToken(payload: RefreshTokenPayload, esProfesional = false): string {
  if (esProfesional) {
    return sign({ ...payload, jti: generarTokenSeguro(16) }, REFRESH_SECRET);
  }
  return sign({ ...payload, jti: generarTokenSeguro(16) }, REFRESH_SECRET, REFRESH_EXPIRES_IN);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
}

// ---------- Pre-sesión (selección de rol) ----------

export function signPreSessionToken(payload: PreSessionTokenPayload): string {
  return sign(payload, ACCESS_SECRET, PRESESSION_EXPIRES_IN);
}

export function verifyPreSessionToken(token: string): PreSessionTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as PreSessionTokenPayload;
}
