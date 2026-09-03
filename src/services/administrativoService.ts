import { prisma } from '../config/prisma';
import { hashPassword, generarPasswordGenerica } from '../utils/password';
import { AppError } from '../utils/AppError';
import { RegistrarAdministrativoInput } from '../validations/administrativoValidation';

const MENSAJE_DNI_DUPLICADO_ADMIN =
  'El DNI ingresado ya se encuentra registrado en el sistema como administrador.';

export async function registrarAdministrativo(
  datos: RegistrarAdministrativoInput,
  idUsuarioCreador: number
) {
  const usuarioExistente = await prisma.usuario.findUnique({
    where: { dni: datos.dni },
    include: { administrativo: true },
  });

  if (usuarioExistente) {
    // Ya es administrativo — no se puede duplicar
    if (usuarioExistente.administrativo) {
      throw new AppError(MENSAJE_DNI_DUPLICADO_ADMIN, 409);
    }

    // Tiene otro rol — agregamos el rol administrativo al usuario existente
    return agregarRolAdministrativo(usuarioExistente.idUsuario, datos, idUsuarioCreador);
  }

  // Usuario nuevo — flujo normal
  return crearUsuarioAdministrativo(datos, idUsuarioCreador);
}

// ─── Usuario nuevo ────────────────────────────────────────────────────────────

async function crearUsuarioAdministrativo(
  datos: RegistrarAdministrativoInput,
  idUsuarioCreador: number
) {
  const rolAdministrativo = await prisma.rol.findFirst({ where: { nombre: 'ADMINISTRATIVO' } });
  if (!rolAdministrativo) {
    throw new AppError('No se encontró el rol ADMINISTRATIVO configurado en el sistema.', 500);
  }

  const passwordTemporal = datos.password ? null : generarPasswordGenerica();
  const passwordFinal = datos.password ?? passwordTemporal!;
  const passwordHash = await hashPassword(passwordFinal);

  const { usuario, administrativo } = await prisma.$transaction(async (tx) => {
    const nuevoUsuario = await tx.usuario.create({
      data: {
        dni: datos.dni,
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: datos.telefono,
        email: datos.email,
        passwordHash,
        estado: 'ACTIVO',
        fechaAlta: new Date(),
        primerLogin: true,
      },
    });

    const nuevoAdministrativo = await tx.administrativo.create({
      data: {
        idUsuario: nuevoUsuario.idUsuario,
        puesto: datos.puesto,
        permisoGestionUsuarios: datos.permisoGestionUsuarios,
        estado: 'ACTIVO',
      },
    });

    await tx.usuarioRol.create({
      data: {
        idUsuario: nuevoUsuario.idUsuario,
        idRol: rolAdministrativo.idRol,
        estado: 'ACTIVO',
        fechaAsignacion: new Date(),
      },
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idUsuarioCreador,
        fechaHora: new Date(),
        accion: 'ALTA_ADMINISTRATIVO',
        tablaAfectada: 'administrativo',
        idRegistroAfectado: nuevoAdministrativo.idAdministrativo,
        datosNuevos: JSON.stringify({
          dni: datos.dni,
          nombre: datos.nombre,
          apellido: datos.apellido,
          puesto: datos.puesto,
          permisoGestionUsuarios: datos.permisoGestionUsuarios,
        }),
        descripcion: `Alta de administrativo (DNI ${datos.dni}). Permiso de gestión: ${
          datos.permisoGestionUsuarios ? 'habilitado' : 'no habilitado'
        }.`,
      },
    });

    return { usuario: nuevoUsuario, administrativo: nuevoAdministrativo };
  });

  return {
    idUsuario: usuario.idUsuario,
    idAdministrativo: administrativo.idAdministrativo,
    mensaje: 'Usuario administrativo registrado correctamente.',
    ...(passwordTemporal && { passwordGenerica: passwordTemporal }),
  };
}

// ─── Usuario existente con otro rol ──────────────────────────────────────────

async function agregarRolAdministrativo(
  idUsuario: number,
  datos: RegistrarAdministrativoInput,
  idUsuarioCreador: number
) {
  const rolAdministrativo = await prisma.rol.findFirst({ where: { nombre: 'ADMINISTRATIVO' } });
  if (!rolAdministrativo) {
    throw new AppError('No se encontró el rol ADMINISTRATIVO configurado en el sistema.', 500);
  }

  const { administrativo } = await prisma.$transaction(async (tx) => {
    const nuevoAdministrativo = await tx.administrativo.create({
      data: {
        idUsuario,
        puesto: datos.puesto,
        permisoGestionUsuarios: datos.permisoGestionUsuarios,
        estado: 'ACTIVO',
        // Datos de contacto alternativos opcionales
        telefonoAlternativo: datos.telefonoAlternativo ?? null,
        emailAlternativo: datos.emailAlternativo ?? null,
      },
    });

    await tx.usuarioRol.create({
      data: {
        idUsuario,
        idRol: rolAdministrativo.idRol,
        estado: 'ACTIVO',
        fechaAsignacion: new Date(),
      },
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idUsuarioCreador,
        fechaHora: new Date(),
        accion: 'ALTA_ADMINISTRATIVO',
        tablaAfectada: 'administrativo',
        idRegistroAfectado: nuevoAdministrativo.idAdministrativo,
        datosNuevos: JSON.stringify({
          idUsuario,
          puesto: datos.puesto,
          permisoGestionUsuarios: datos.permisoGestionUsuarios,
          telefonoAlternativo: datos.telefonoAlternativo,
          emailAlternativo: datos.emailAlternativo,
        }),
        descripcion: `Rol administrativo agregado a usuario existente (idUsuario ${idUsuario}). Permiso de gestión: ${
          datos.permisoGestionUsuarios ? 'habilitado' : 'no habilitado'
        }.`,
      },
    });

    return { administrativo: nuevoAdministrativo };
  });

  return {
    idUsuario,
    idAdministrativo: administrativo.idAdministrativo,
    mensaje: 'Rol administrativo agregado correctamente al usuario existente.',
  };
}