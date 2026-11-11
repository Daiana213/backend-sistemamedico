import { prisma } from '../config/prisma';
import { hashPassword, generarPasswordGenerica } from '../utils/password';
import { AppError } from '../utils/AppError';
import {
  RegistrarAdministrativoInput,
  ActualizarAdministrativoInput,
} from '../validations/administrativoValidation';

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

export async function listarAdministrativos() {
  const administrativos = await prisma.administrativo.findMany({
    include: {
      usuario: {
        select: {
          idUsuario: true,
          nombre: true,
          apellido: true,
          dni: true,
          email: true,
          telefono: true,
        },
      },
    },
    orderBy: [
      { usuario: { apellido: 'asc' } },
      { usuario: { nombre: 'asc' } },
    ],
  });

  return administrativos.map((admin) => ({
    idAdministrativo: admin.idAdministrativo,
    idUsuario: admin.idUsuario,
    nombre: admin.usuario.nombre,
    apellido: admin.usuario.apellido,
    nombreCompleto: `${admin.usuario.nombre} ${admin.usuario.apellido}`.trim(),
    dni: admin.usuario.dni,
    puesto: admin.puesto,
    email: admin.emailAlternativo || admin.usuario.email || '',
    telefono: admin.telefonoAlternativo || admin.usuario.telefono || '',
    permisoGestionUsuarios: admin.permisoGestionUsuarios,
    estado: admin.estado,
  }));
}

export async function actualizarAdministrativo(
  idAdministrativo: number,
  datos: ActualizarAdministrativoInput,
  idUsuarioOperador: number,
  ip?: string
) {
  const administrativo = await prisma.administrativo.findUnique({
    where: { idAdministrativo },
    include: {
      usuario: true,
    },
  });

  if (!administrativo) {
    throw new AppError('Administrativo no encontrado.', 404);
  }

  if (datos.estado === 'INACTIVO' && administrativo.idUsuario === idUsuarioOperador) {
    throw new AppError('No podés desactivar tu propia cuenta de administrador.', 400);
  }

  const quiereQuitarPermiso =
    datos.permisoGestionUsuarios === false && administrativo.permisoGestionUsuarios === true;
  const quiereDesactivarConPermiso =
    datos.estado === 'INACTIVO' &&
    (datos.permisoGestionUsuarios ?? administrativo.permisoGestionUsuarios) === true &&
    administrativo.estado === 'ACTIVO';

  if (quiereQuitarPermiso || quiereDesactivarConPermiso) {
    const otrosAdminsConGestion = await prisma.administrativo.count({
      where: {
        idAdministrativo: { not: idAdministrativo },
        estado: 'ACTIVO',
        permisoGestionUsuarios: true,
      },
    });

    if (otrosAdminsConGestion === 0) {
      throw new AppError(
        'No podés quitar el permiso de gestión ni desactivar al único administrador con dicho permiso activo.',
        400
      );
    }
  }

  const datosAnteriores = {
    puesto: administrativo.puesto,
    permisoGestionUsuarios: administrativo.permisoGestionUsuarios,
    estado: administrativo.estado,
  };

  const nuevoPuesto = datos.puesto ?? administrativo.puesto;
  const nuevoPermiso = datos.permisoGestionUsuarios ?? administrativo.permisoGestionUsuarios;
  const nuevoEstado = datos.estado ?? administrativo.estado;

  const adminActualizado = await prisma.$transaction(async (tx) => {
    const actualizado = await tx.administrativo.update({
      where: { idAdministrativo },
      data: {
        puesto: nuevoPuesto,
        permisoGestionUsuarios: nuevoPermiso,
        estado: nuevoEstado,
      },
    });

    if (datos.estado !== undefined) {
      const rolAdmin = await tx.rol.findFirst({ where: { nombre: 'ADMINISTRATIVO' } });
      if (rolAdmin) {
        await tx.usuarioRol.updateMany({
          where: {
            idUsuario: administrativo.idUsuario,
            idRol: rolAdmin.idRol,
          },
          data: {
            estado: nuevoEstado,
          },
        });
      }

      if (nuevoEstado === 'ACTIVO' && administrativo.usuario.estado === 'INACTIVO') {
        await tx.usuario.update({
          where: { idUsuario: administrativo.idUsuario },
          data: { estado: 'ACTIVO' },
        });
      }

      if (nuevoEstado === 'INACTIVO') {
        const otrosRolesActivos = await tx.usuarioRol.count({
          where: {
            idUsuario: administrativo.idUsuario,
            rol: { nombre: { not: 'ADMINISTRATIVO' } },
            estado: 'ACTIVO',
          },
        });
        if (otrosRolesActivos === 0) {
          await tx.usuario.update({
            where: { idUsuario: administrativo.idUsuario },
            data: { estado: 'INACTIVO' },
          });
        }
      }
    }

    await tx.auditoria.create({
      data: {
        idUsuario: idUsuarioOperador,
        fechaHora: new Date(),
        accion: 'MODIFICACION_ADMINISTRATIVO',
        tablaAfectada: 'administrativo',
        idRegistroAfectado: idAdministrativo,
        datosAnteriores: JSON.stringify(datosAnteriores),
        datosNuevos: JSON.stringify({
          puesto: nuevoPuesto,
          permisoGestionUsuarios: nuevoPermiso,
          estado: nuevoEstado,
        }),
        ip,
        descripcion: `Actualización de administrativo ${administrativo.usuario.nombre} ${administrativo.usuario.apellido} (DNI ${administrativo.usuario.dni}). Puesto: ${nuevoPuesto}, Permiso de gestión: ${nuevoPermiso ? 'habilitado' : 'no habilitado'}, Estado: ${nuevoEstado}.`,
      },
    });

    return actualizado;
  });

  return {
    mensaje: 'Perfil administrativo actualizado correctamente.',
    administrativo: {
      idAdministrativo: adminActualizado.idAdministrativo,
      idUsuario: adminActualizado.idUsuario,
      nombreCompleto: `${administrativo.usuario.nombre} ${administrativo.usuario.apellido}`.trim(),
      puesto: adminActualizado.puesto,
      permisoGestionUsuarios: adminActualizado.permisoGestionUsuarios,
      estado: adminActualizado.estado,
    },
  };
}