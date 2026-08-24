import jwt, { SignOptions } from 'jsonwebtoken';

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
}

export interface RefreshTokenPayload {
  idUsuario: number;
}

export interface PreSessionTokenPayload {
  idUsuario: number;
}

function sign<T extends object>(payload: T, secret: string, expiresIn: string): string {
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
}

// ---------- Access token ----------

export function signAccessToken(payload: AccessTokenPayload): string {
  return sign(payload, ACCESS_SECRET, ACCESS_EXPIRES_IN);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

// ---------- Refresh token ----------

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return sign(payload, REFRESH_SECRET, REFRESH_EXPIRES_IN);
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