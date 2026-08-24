import { prisma } from '../config/prisma';
import { comparePassword } from '../utils/password';
import { hashToken } from '../utils/crypto';
import {
  signAccessToken,
  signRefreshToken,
  signPreSessionToken,
  verifyPreSessionToken,
  verifyRefreshToken,
  RolActivo,
} from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { LoginInput, SeleccionarRolInput } from '../validations/authValidation';

const MENSAJE_CREDENCIALES_INVALIDAS = 'DNI o contraseña incorrectos';
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

interface RolDisponible {
  rol: RolActivo;
  idRolEspecifico: number;
  permisos?: string[];
}

// Vuelve a traer al usuario con todo lo necesario para resolver sus roles
async function buscarUsuarioCompleto(idUsuario: number) {
  return prisma.usuario.findUnique({
    where: { idUsuario },
    include: {
      roles: { include: { rol: true } },
      paciente: true,
      profesional: true,
      administrativo: true,
    },
  });
}

// Determina qué roles están realmente disponibles HOY para este usuario,
// cruzando usuario_rol.estado con el estado específico de cada tabla de rol.
function resolverRolesDisponibles(
  usuario: NonNullable<Awaited<ReturnType<typeof buscarUsuarioCompleto>>>,
): RolDisponible[] {
  const disponibles: RolDisponible[] = [];

  for (const usuarioRol of usuario.roles) {
    if (usuarioRol.estado !== 'ACTIVO') continue;

    const nombreRol = usuarioRol.rol.nombre as RolActivo;

    if (nombreRol === 'PACIENTE' && usuario.paciente && usuario.paciente.estado === 'ACTIVO') {
      disponibles.push({ rol: 'PACIENTE', idRolEspecifico: usuario.paciente.idPaciente });
    }

    if (nombreRol === 'PROFESIONAL' && usuario.profesional && usuario.profesional.estado === 'ACTIVO') {
      disponibles.push({ rol: 'PROFESIONAL', idRolEspecifico: usuario.profesional.idProfesional });
    }

    if (nombreRol === 'ADMINISTRATIVO' && usuario.administrativo && usuario.administrativo.estado === 'ACTIVO') {
      const permisos = usuario.administrativo.permisoGestionUsuarios ? ['gestion_usuarios'] : [];
      disponibles.push({ rol: 'ADMINISTRATIVO', idRolEspecifico: usuario.administrativo.idAdministrativo, permisos });
    }
  }

  return disponibles;
}

// Emite access + refresh token para un rol ya resuelto, y persiste el refresh
async function emitirTokens(idUsuario: number, rolInfo: RolDisponible) {
  const accessToken = signAccessToken({
    idUsuario,
    rolActivo: rolInfo.rol,
    idRolEspecifico: rolInfo.idRolEspecifico,
    permisos: rolInfo.permisos,
  });

  const refreshToken = signRefreshToken({ idUsuario });

  await prisma.refreshToken.create({
    data: {
      idUsuario,
      tokenHash: hashToken(refreshToken),
      fechaCreacion: new Date(),
      fechaExpiracion: new Date(Date.now() + REFRESH_EXPIRES_MS),
      revocado: false,
    },
  });

  return { accessToken, refreshToken, rolActivo: rolInfo.rol };
}

export async function login({ dni, password }: LoginInput) {
  const usuario = await prisma.usuario.findUnique({
    where: { dni },
    include: {
      roles: { include: { rol: true } },
      paciente: true,
      profesional: true,
      administrativo: true,
    },
  });

  if (!usuario) {
    throw new AppError(MENSAJE_CREDENCIALES_INVALIDAS, 401);
  }

  const passwordValida = await comparePassword(password, usuario.passwordHash);
  if (!passwordValida) {
    throw new AppError(MENSAJE_CREDENCIALES_INVALIDAS, 401);
  }

  if (usuario.estado !== 'ACTIVO') {
    throw new AppError('Tu cuenta está inactiva. Contactate con administración.', 403);
  }

  const rolesDisponibles = resolverRolesDisponibles(usuario);

  if (rolesDisponibles.length === 0) {
    throw new AppError('No tenés accesos activos en el sistema. Contactate con administración.', 403);
  }

  if (rolesDisponibles.length === 1) {
    return emitirTokens(usuario.idUsuario, rolesDisponibles[0]);
  }

  // Más de un rol usable: pre-sesión, el cliente elige después
  const preSessionToken = signPreSessionToken({ idUsuario: usuario.idUsuario });
  return {
    requiereSeleccionRol: true as const,
    preSessionToken,
    rolesDisponibles: rolesDisponibles.map((r) => r.rol),
  };
}

export async function seleccionarRol({ preSessionToken, rol }: SeleccionarRolInput) {
  let idUsuario: number;

  try {
    ({ idUsuario } = verifyPreSessionToken(preSessionToken));
  } catch {
    throw new AppError('El token de selección de rol es inválido o expiró', 401);
  }

  const usuario = await buscarUsuarioCompleto(idUsuario);
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }

  // Se revalida contra la base, no se confía en lo que mandó el cliente antes
  const rolesDisponibles = resolverRolesDisponibles(usuario);
  const rolElegido = rolesDisponibles.find((r) => r.rol === rol);

  if (!rolElegido) {
    throw new AppError('No tenés acceso a ese rol', 403);
  }

  return emitirTokens(usuario.idUsuario, rolElegido);
}

export async function refresh(refreshToken: string) {
  let idUsuario: number;

  try {
    ({ idUsuario } = verifyRefreshToken(refreshToken));
  } catch {
    throw new AppError('El refresh token es inválido o expiró', 401);
  }

  // Se valida también contra la base, no solo la firma del JWT:
  // esto es lo que permite revocar un refresh token antes de su expiración natural
  const tokenHash = hashToken(refreshToken);
  const registro = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!registro || registro.revocado || registro.fechaExpiracion < new Date()) {
    throw new AppError('El refresh token es inválido o expiró', 401);
  }

  const usuario = await buscarUsuarioCompleto(idUsuario);
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }

  const rolesDisponibles = resolverRolesDisponibles(usuario);

  if (rolesDisponibles.length === 0) {
    throw new AppError('No tenés accesos activos en el sistema.', 403);
  }

  if (rolesDisponibles.length === 1) {
    const rolInfo = rolesDisponibles[0];
    const accessToken = signAccessToken({
      idUsuario: usuario.idUsuario,
      rolActivo: rolInfo.rol,
      idRolEspecifico: rolInfo.idRolEspecifico,
      permisos: rolInfo.permisos,
    });
    return { accessToken, rolActivo: rolInfo.rol };
  }

  const preSessionToken = signPreSessionToken({ idUsuario: usuario.idUsuario });
  return {
    requiereSeleccionRol: true as const,
    preSessionToken,
    rolesDisponibles: rolesDisponibles.map((r) => r.rol),
  };
}

export async function logout(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);

  // updateMany, no update: si el token ya no existe o ya estaba revocado,
  // no tiene sentido tirar un error — el resultado deseado ya se cumple
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revocado: false },
    data: { revocado: true },
  });
}