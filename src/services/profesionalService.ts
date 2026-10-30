import { prisma } from '../config/prisma';
import { hashPassword, generarPasswordGenerica } from '../utils/password';
import { AppError } from '../utils/AppError';
import { RegistrarProfesionalInput } from '../validations/profesionalValidation';
import { obtenerObrasSocialesAtendidasPorProfesional } from './obraSocialService';

export async function registrarProfesional(
  datos: RegistrarProfesionalInput,
  idAdministrativo: number,
  ip?: string
) {
  // Matrícula duplicada — se chequea siempre, independientemente de si el usuario existe
  const matriculaExistente = await prisma.profesional.findUnique({ where: { matricula: datos.matricula } });
  if (matriculaExistente) {
    throw new AppError('La matrícula ingresada ya se encuentra registrada en el sistema.', 409);
  }

  // Validar especialidades
  const especialidades = await prisma.especialidad.findMany({
    where: { idEspecialidad: { in: datos.especialidades }, estado: 'ACTIVO' },
  });
  if (especialidades.length !== datos.especialidades.length) {
    throw new AppError('Una o más especialidades seleccionadas no son válidas.', 400);
  }

  const rolProfesional = await prisma.rol.findFirst({ where: { nombre: 'PROFESIONAL' } });
  if (!rolProfesional) {
    throw new AppError('No se encontró el rol PROFESIONAL configurado en el sistema.', 500);
  }

  const usuarioExistente = await prisma.usuario.findUnique({
    where: { dni: datos.dni },
    include: { profesional: true },
  });

  if (usuarioExistente) {
    if (usuarioExistente.profesional) {
      throw new AppError('El DNI ingresado ya se encuentra registrado como profesional en el sistema.', 409);
    }
    // Tiene otro rol — agregamos el rol profesional
    return agregarRolProfesional(usuarioExistente.idUsuario, datos, rolProfesional.idRol, idAdministrativo, ip);
  }

  return crearUsuarioProfesional(datos, rolProfesional.idRol, idAdministrativo, ip);
}

// ─── Usuario nuevo ────────────────────────────────────────────────────────────

async function crearUsuarioProfesional(
  datos: RegistrarProfesionalInput,
  idRol: number,
  idAdministrativo: number,
  ip?: string
) {
  const passwordHash = await hashPassword(datos.password);

  await prisma.$transaction(async (tx) => {
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

    const nuevoProfesional = await tx.profesional.create({
      data: {
        idUsuario: nuevoUsuario.idUsuario,
        matricula: datos.matricula,
        estado: 'ACTIVO',
        fechaAlta: new Date(),
      },
    });

    await tx.usuarioRol.create({
      data: {
        idUsuario: nuevoUsuario.idUsuario,
        idRol,
        estado: 'ACTIVO',
        fechaAsignacion: new Date(),
      },
    });

    await tx.profesionalEspecialidad.createMany({
      data: datos.especialidades.map((idEspecialidad) => ({
        idProfesional: nuevoProfesional.idProfesional,
        idEspecialidad,
        fechaAsignacion: new Date(),
        estado: 'ACTIVO',
      })),
    });

    if (datos.obrasSociales && datos.obrasSociales.length > 0) {
      await tx.profesionalObraSocial.createMany({
        data: datos.obrasSociales.map((idObraSocial) => ({
          idProfesional: nuevoProfesional.idProfesional,
          idObraSocial,
          fechaAsignacion: new Date(),
          estado: 'ACTIVO',
        })),
      });
    }

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'ALTA_PROFESIONAL',
        tablaAfectada: 'profesional',
        idRegistroAfectado: nuevoProfesional.idProfesional,
        descripcion: `Alta de profesional ${datos.nombre} ${datos.apellido} (matrícula: ${datos.matricula}).`,
        ip,
      },
    });
  });

  return {
    mensaje: 'Profesional registrado correctamente en el sistema.',
  };
}

// ─── Usuario existente con otro rol ──────────────────────────────────────────

async function agregarRolProfesional(
  idUsuario: number,
  datos: RegistrarProfesionalInput,
  idRol: number,
  idAdministrativo: number,
  ip?: string
) {
  const passwordHash = await hashPassword(datos.password);

  await prisma.$transaction(async (tx) => {
    // Actualizamos el passwordHash para que use la nueva contraseña genérica
    await tx.usuario.update({
      where: { idUsuario },
      data: { passwordHash, primerLogin: true },
    });

    const nuevoProfesional = await tx.profesional.create({
      data: {
        idUsuario,
        matricula: datos.matricula,
        estado: 'ACTIVO',
        fechaAlta: new Date(),
        telefonoAlternativo: datos.telefonoAlternativo ?? null,
        emailAlternativo: datos.emailAlternativo ?? null,
      },
    });

    await tx.usuarioRol.create({
      data: {
        idUsuario,
        idRol,
        estado: 'ACTIVO',
        fechaAsignacion: new Date(),
      },
    });

    await tx.profesionalEspecialidad.createMany({
      data: datos.especialidades.map((idEspecialidad) => ({
        idProfesional: nuevoProfesional.idProfesional,
        idEspecialidad,
        fechaAsignacion: new Date(),
        estado: 'ACTIVO',
      })),
    });

    if (datos.obrasSociales && datos.obrasSociales.length > 0) {
      await tx.profesionalObraSocial.createMany({
        data: datos.obrasSociales.map((idObraSocial) => ({
          idProfesional: nuevoProfesional.idProfesional,
          idObraSocial,
          fechaAsignacion: new Date(),
          estado: 'ACTIVO',
        })),
      });
    }

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'ALTA_PROFESIONAL',
        tablaAfectada: 'profesional',
        idRegistroAfectado: nuevoProfesional.idProfesional,
        descripcion: `Rol profesional agregado a usuario existente (idUsuario ${idUsuario}, matrícula: ${datos.matricula}).`,
        ip,
      },
    });
  });

  return {
    mensaje: 'Rol profesional agregado correctamente al usuario existente.',
  };
}

import { EditarProfesionalInput } from '../validations/profesionalEdicionValidation';

export async function listarProfesionales(idEspecialidad?: number, incluirInactivos = false) {
  const whereClause: any = {};

  if (!incluirInactivos) {
    whereClause.estado = 'ACTIVO';
  }

  if (idEspecialidad) {
    whereClause.especialidades = {
      some: {
        idEspecialidad,
        estado: 'ACTIVO',
      },
    };
  }

  const profesionales = await prisma.profesional.findMany({
    where: whereClause,
    include: {
      usuario: {
        select: {
          nombre: true,
          apellido: true,
          dni: true,
          email: true,
          telefono: true,
        },
      },
      especialidades: {
        where: { estado: 'ACTIVO' },
        include: {
          especialidad: true,
        },
      },
    },
    orderBy: {
      usuario: {
        apellido: 'asc',
      },
    },
  });

  return Promise.all(
    profesionales.map(async (p) => {
      const obrasSociales = await obtenerObrasSocialesAtendidasPorProfesional(p.idProfesional);
      return {
        idProfesional: p.idProfesional,
        idUsuario: p.idUsuario,
        nombreCompleto: `${p.usuario.nombre} ${p.usuario.apellido}`,
        matricula: p.matricula,
        estado: p.estado,
        especialidades: p.especialidades.map((e) => e.especialidad.nombre),
        especialidadesDetalle: p.especialidades.map((e) => ({
          idEspecialidad: e.especialidad.idEspecialidad,
          nombre: e.especialidad.nombre,
        })),
        obrasSociales: obrasSociales.map((os) => os.nombre),
        obrasSocialesDetalle: obrasSociales,
      };
    })
  );
}

export async function obtenerProfesionalPorId(idProfesional: number) {
  const profesional = await prisma.profesional.findUnique({
    where: { idProfesional },
    include: {
      usuario: true,
      especialidades: {
        where: { estado: 'ACTIVO' },
        include: {
          especialidad: true,
        },
      },
    },
  });

  if (!profesional) {
    throw new AppError('Profesional no encontrado.', 404);
  }

  return {
    idProfesional: profesional.idProfesional,
    idUsuario: profesional.idUsuario,
    matricula: profesional.matricula,
    estado: profesional.estado,
    fechaAlta: profesional.fechaAlta,
    fechaBaja: profesional.fechaBaja,
    telefonoAlternativo: profesional.telefonoAlternativo,
    emailAlternativo: profesional.emailAlternativo,
    usuario: {
      idUsuario: profesional.usuario.idUsuario,
      nombre: profesional.usuario.nombre,
      apellido: profesional.usuario.apellido,
      dni: profesional.usuario.dni,
      email: profesional.usuario.email,
      telefono: profesional.usuario.telefono,
    },
    especialidades: profesional.especialidades.map((e) => ({
      idEspecialidad: e.especialidad.idEspecialidad,
      nombre: e.especialidad.nombre,
    })),
    obrasSociales: await obtenerObrasSocialesAtendidasPorProfesional(profesional.idProfesional),
  };
}

export async function editarProfesional(
  idProfesional: number,
  datos: EditarProfesionalInput,
  idAdministrativo: number,
  ip?: string
) {
  const profesional = await prisma.profesional.findUnique({
    where: { idProfesional },
    include: {
      usuario: true,
      especialidades: {
        where: { estado: 'ACTIVO' },
      },
    },
  });

  if (!profesional) {
    throw new AppError('Profesional no encontrado.', 404);
  }

  // Si se cambia el email, validar que no esté en uso por otro usuario
  if (datos.email && datos.email !== profesional.usuario.email) {
    const usuarioConEmail = await prisma.usuario.findFirst({
      where: {
        email: datos.email,
        idUsuario: { not: profesional.idUsuario },
      },
    });
    if (usuarioConEmail) {
      throw new AppError('El correo electrónico ingresado ya se encuentra registrado.', 409);
    }
  }

  // Validar especialidades
  const especialidades = await prisma.especialidad.findMany({
    where: { idEspecialidad: { in: datos.especialidades }, estado: 'ACTIVO' },
  });
  if (especialidades.length !== datos.especialidades.length) {
    throw new AppError('Una o más especialidades seleccionadas no son válidas.', 400);
  }

  const prevData = {
    nombre: profesional.usuario.nombre,
    apellido: profesional.usuario.apellido,
    telefono: profesional.usuario.telefono,
    email: profesional.usuario.email,
    telefonoAlternativo: profesional.telefonoAlternativo,
    emailAlternativo: profesional.emailAlternativo,
    estado: profesional.estado,
    especialidades: profesional.especialidades.map((e) => e.idEspecialidad),
  };

  await prisma.$transaction(async (tx) => {
    // 1. Actualizar datos de usuario
    await tx.usuario.update({
      where: { idUsuario: profesional.idUsuario },
      data: {
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: datos.telefono,
        email: datos.email,
      },
    });

    // 2. Actualizar datos del profesional
    await tx.profesional.update({
      where: { idProfesional },
      data: {
        telefonoAlternativo: datos.telefonoAlternativo ?? null,
        emailAlternativo: datos.emailAlternativo ?? null,
        ...(datos.estado ? { estado: datos.estado } : {}),
      },
    });

    // 3. Sincronizar especialidades
    await tx.profesionalEspecialidad.deleteMany({
      where: { idProfesional },
    });

    await tx.profesionalEspecialidad.createMany({
      data: datos.especialidades.map((idEspecialidad) => ({
        idProfesional,
        idEspecialidad,
        fechaAsignacion: new Date(),
        estado: 'ACTIVO',
      })),
    });

    if (datos.obrasSociales !== undefined) {
      await tx.profesionalObraSocial.deleteMany({
        where: { idProfesional },
      });
      if (datos.obrasSociales.length > 0) {
        await tx.profesionalObraSocial.createMany({
          data: datos.obrasSociales.map((idObraSocial) => ({
            idProfesional,
            idObraSocial,
            fechaAsignacion: new Date(),
            estado: 'ACTIVO',
          })),
        });
      }
    }

    // 4. Log de auditoría con diff
    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'MODIFICACION_PROFESIONAL',
        tablaAfectada: 'profesional',
        idRegistroAfectado: idProfesional,
        datosAnteriores: JSON.stringify(prevData),
        datosNuevos: JSON.stringify(datos),
        ip,
        descripcion: `Edición de datos de profesional ${datos.nombre} ${datos.apellido} (matrícula: ${profesional.matricula}).`,
      },
    });
  });

  return {
    mensaje: 'Profesional actualizado correctamente.',
  };
}

export async function darDeBajaProfesional(
  idProfesional: number,
  idAdministrativo: number,
  ip?: string
) {
  const profesional = await prisma.profesional.findUnique({
    where: { idProfesional },
    include: { usuario: true },
  });

  if (!profesional) {
    throw new AppError('Profesional no encontrado.', 404);
  }

  // Escenario 4: Verificar si posee turnos pendientes
  const turnosPendientes = await prisma.turno.findMany({
    where: {
      idProfesional,
      estado: { in: ['SOLICITADO', 'CONFIRMADO'] },
    },
    include: {
      paciente: {
        include: {
          usuario: {
            select: {
              nombre: true,
              apellido: true,
              dni: true,
            },
          },
        },
      },
    },
    orderBy: { fechaHora: 'asc' },
  });

  if (turnosPendientes.length > 0) {
    throw new AppError(
      'No es posible dar de baja al profesional porque posee turnos pendientes.',
      409,
      {
        turnosPendientes: turnosPendientes.map((t) => ({
          idTurno: t.idTurno,
          fechaHora: t.fechaHora,
          estado: t.estado,
          paciente: `${t.paciente.usuario.nombre} ${t.paciente.usuario.apellido}`,
          dniPaciente: t.paciente.usuario.dni,
        })),
      }
    );
  }

  // Escenario 3: Baja lógica sin turnos pendientes
  await prisma.$transaction(async (tx) => {
    await tx.profesional.update({
      where: { idProfesional },
      data: {
        estado: 'INACTIVO',
        fechaBaja: new Date(),
      },
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'BAJA_LOGICA_PROFESIONAL',
        tablaAfectada: 'profesional',
        idRegistroAfectado: idProfesional,
        datosAnteriores: JSON.stringify({ estado: profesional.estado }),
        datosNuevos: JSON.stringify({ estado: 'INACTIVO', fechaBaja: new Date() }),
        ip,
        descripcion: `Baja lógica de profesional ${profesional.usuario.nombre} ${profesional.usuario.apellido} (matrícula: ${profesional.matricula}).`,
      },
    });
  });

  return {
    mensaje: 'El profesional ha sido dado de baja correctamente.',
  };
}


export async function actualizarObrasSocialesProfesional(
  idProfesional: number,
  obrasSocialesIds: number[],
  idAdministrativo: number,
  ip?: string
) {
  const profesional = await prisma.profesional.findUnique({
    where: { idProfesional },
    include: { usuario: true },
  });

  if (!profesional) {
    throw new AppError('Profesional no encontrado.', 404);
  }

  if (obrasSocialesIds.length > 0) {
    const obrasValidas = await prisma.obraSocial.findMany({
      where: { idObraSocial: { in: obrasSocialesIds }, estado: 'ACTIVO' },
    });
    if (obrasValidas.length !== obrasSocialesIds.length) {
      throw new AppError('Una o más obras sociales seleccionadas no existen o están inactivas.', 400);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.profesionalObraSocial.deleteMany({
      where: { idProfesional },
    });

    if (obrasSocialesIds.length > 0) {
      await tx.profesionalObraSocial.createMany({
        data: obrasSocialesIds.map((idObraSocial) => ({
          idProfesional,
          idObraSocial,
          fechaAsignacion: new Date(),
          estado: 'ACTIVO',
        })),
      });
    }

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'ACTUALIZAR_OBRAS_SOCIALES_PROFESIONAL',
        tablaAfectada: 'profesional_obra_social',
        idRegistroAfectado: idProfesional,
        datosNuevos: JSON.stringify({ obrasSocialesIds }),
        ip,
        descripcion: `Actualización de obras sociales atendidas por el profesional ${profesional.usuario.nombre} ${profesional.usuario.apellido}.`,
      },
    });
  });

  const obrasSocialesActualizadas = await obtenerObrasSocialesAtendidasPorProfesional(idProfesional);

  return {
    mensaje: 'Obras sociales del profesional actualizadas correctamente.',
    obrasSociales: obrasSocialesActualizadas,
  };
}
