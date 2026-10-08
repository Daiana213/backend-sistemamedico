import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { AccessTokenPayload } from '../utils/jwt';
import { CrearTurnoInput } from '../validations/turnoValidation';
import { verificarPerfilCompletoParaTurno } from './pacienteService';

/**
 * Servicio para la creación y gestión de turnos médicos.
 */
export async function crearTurno(
  datos: CrearTurnoInput,
  usuarioAutenticado: AccessTokenPayload
) {
  let idPaciente: number;

  if (usuarioAutenticado.rolActivo === 'PACIENTE') {
    // Si quien llama es un paciente autenticado, obtenemos su idPaciente
    const pacienteLogueado = await prisma.paciente.findUnique({
      where: { idUsuario: usuarioAutenticado.idUsuario },
    });

    if (!pacienteLogueado) {
      throw new AppError('No se encontró el registro de paciente asociado a su usuario.', 404);
    }
    idPaciente = pacienteLogueado.idPaciente;
  } else if (
    usuarioAutenticado.rolActivo === 'ADMINISTRATIVO' ||
    usuarioAutenticado.rolActivo === 'PROFESIONAL'
  ) {
    // Si un administrativo o profesional crea el turno, debe especificar idPaciente
    if (!datos.idPaciente) {
      throw new AppError('Debe especificar el idPaciente al registrar un turno.', 400);
    }
    idPaciente = datos.idPaciente;
  } else {
    throw new AppError('No posee permisos para solicitar o crear turnos.', 403);
  }

  // 1. Obtener al paciente con sus relaciones para verificar los datos de su perfil
  const paciente = await prisma.paciente.findUnique({
    where: { idPaciente },
    include: {
      usuario: true,
      plan: {
        include: {
          obraSocial: true,
        },
      },
    },
  });

  if (!paciente) {
    throw new AppError('El paciente especificado no existe en el sistema.', 404);
  }

  // 2. VALIDACIÓN CRÍTICA: Verificar si el paciente tiene email, sexo y obra social/plan.
  // Si falta alguno de estos datos, se arroja un error 403 pidiéndole completar su perfil.
  verificarPerfilCompletoParaTurno(paciente);

  // 3. Verificar que el profesional exista y esté activo
  const profesional = await prisma.profesional.findUnique({
    where: {
      idProfesional: datos.idProfesional,
      estado: 'ACTIVO',
    },
    include: {
      usuario: true,
    },
  });

  if (!profesional) {
    throw new AppError('El profesional seleccionado no existe o no se encuentra activo.', 404);
  }

  // 4. Verificar que no exista un turno superpuesto para ese profesional
  const turnoExistente = await prisma.turno.findFirst({
    where: {
      idProfesional: datos.idProfesional,
      fechaHora: datos.fechaHora,
      estado: {
        in: ['SOLICITADO', 'CONFIRMADO'],
      },
    },
  });

  if (turnoExistente) {
    throw new AppError(
      'El profesional ya cuenta con un turno reservado para esa fecha y hora.',
      409
    );
  }

  // 4.5. Escenario 2: Verificar que el paciente no tenga ya dos turnos activos con este profesional
  const turnosActivos = await prisma.turno.count({
    where: {
      idPaciente,
      idProfesional: datos.idProfesional,
      estado: {
        in: ['SOLICITADO', 'CONFIRMADO'],
      },
    },
  });

  if (turnosActivos >= 2) {
    throw new AppError(
      'Ya tenés dos turnos activos con este profesional.',
      409
    );
  }

  // 5. Crear el nuevo turno. El índice único parcial
  //    uq_turno_profesional_fechahora_activo garantiza la unicidad ante solicitudes
  //    simultáneas; la violación (P2002) se traduce a 409.
  let nuevoTurno;
  try {
  nuevoTurno = await prisma.turno.create({
    data: {
      idPaciente,
      idProfesional: datos.idProfesional,
      fechaHora: datos.fechaHora,
      estado: 'SOLICITADO',
    },
    include: {
      paciente: {
        include: {
          usuario: {
            select: {
              dni: true,
              nombre: true,
              apellido: true,
              email: true,
              telefono: true,
            },
          },
          plan: {
            include: {
              obraSocial: true,
            },
          },
        },
      },
      profesional: {
        include: {
          usuario: {
            select: {
              nombre: true,
              apellido: true,
            },
          },
        },
      },
    },
  });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(
        'El profesional ya cuenta con un turno reservado para esa fecha y hora.',
        409
      );
    }
    throw error;
  }

  return {
    mensaje: 'Turno solicitado exitosamente.',
    turno: nuevoTurno,
  };
}

/**
 * Crea un turno por parte del profesional autenticado, sin requerir que mande idProfesional
 */
export async function crearTurnoPorProfesional(
  datos: { idPaciente: number; fechaHora: string | Date },
  usuarioAutenticado: AccessTokenPayload
) {
  const profesional = await prisma.profesional.findUnique({
    where: { idUsuario: usuarioAutenticado.idUsuario },
  });

  if (!profesional) {
    throw new AppError('Perfil de profesional no encontrado.', 404);
  }

  const fechaHora = new Date(datos.fechaHora);
  if (isNaN(fechaHora.getTime())) {
    throw new AppError('Formato de fechaHora inválido', 400);
  }

  if (fechaHora.getTime() <= Date.now()) {
    throw new AppError('La fecha y hora del turno debe ser posterior a la fecha y hora actual.', 400);
  }

  const crearTurnoDatos: CrearTurnoInput = {
    idProfesional: profesional.idProfesional,
    fechaHora,
    idPaciente: datos.idPaciente,
  };

  return crearTurno(crearTurnoDatos, usuarioAutenticado);
}

/**
 * Listar turnos según el rol del usuario autenticado.
 */
export async function listarTurnos(usuarioAutenticado: AccessTokenPayload) {
  if (usuarioAutenticado.rolActivo === 'PACIENTE') {
    const paciente = await prisma.paciente.findUnique({
      where: { idUsuario: usuarioAutenticado.idUsuario },
    });

    if (!paciente) {
      throw new AppError('No se encontró el perfil de paciente.', 404);
    }

    return prisma.turno.findMany({
      where: { idPaciente: paciente.idPaciente },
      include: {
        profesional: {
          include: {
            usuario: {
              select: {
                nombre: true,
                apellido: true,
              },
            },
          },
        },
        consulta: true,
      },
      orderBy: { fechaHora: 'asc' },
    });
  }

  if (usuarioAutenticado.rolActivo === 'PROFESIONAL') {
    const profesional = await prisma.profesional.findUnique({
      where: { idUsuario: usuarioAutenticado.idUsuario },
    });

    if (!profesional) {
      throw new AppError('No se encontró el perfil de profesional.', 404);
    }

    return prisma.turno.findMany({
      where: { idProfesional: profesional.idProfesional },
      include: {
        paciente: {
          include: {
            usuario: {
              select: {
                dni: true,
                nombre: true,
                apellido: true,
                telefono: true,
                email: true,
              },
            },
            plan: {
              include: {
                obraSocial: true,
              },
            },
          },
        },
        consulta: true,
      },
      orderBy: { fechaHora: 'asc' },
    });
  }

  // Si es ADMINISTRATIVO, lista los turnos generales
  return prisma.turno.findMany({
    include: {
      paciente: {
        include: {
          usuario: {
            select: {
              dni: true,
              nombre: true,
              apellido: true,
              telefono: true,
            },
          },
          plan: {
            include: {
              obraSocial: true,
            },
          },
        },
      },
      profesional: {
        include: {
          usuario: {
            select: {
              nombre: true,
              apellido: true,
            },
          },
        },
      },
      consulta: true,
    },
    orderBy: { fechaHora: 'desc' },
    take: 100,
  });
}

/**
 * Cancelar un turno.
 * Requiere que la fecha del turno supere el límite mínimo de anticipación (24 horas).
 */
export async function cancelarTurno(idTurno: number, usuarioAutenticado: AccessTokenPayload) {
  const turno = await prisma.turno.findUnique({
    where: { idTurno },
    include: { paciente: true },
  });

  if (!turno) {
    throw new AppError('Turno no encontrado.', 404);
  }

  // Validar permisos
  if (usuarioAutenticado.rolActivo === 'PACIENTE') {
    const paciente = await prisma.paciente.findUnique({
      where: { idUsuario: usuarioAutenticado.idUsuario },
    });
    if (!paciente || paciente.idPaciente !== turno.idPaciente) {
      throw new AppError('No tiene permisos para cancelar este turno.', 403);
    }
  }

  // Validar estados permitidos
  if (!['SOLICITADO', 'CONFIRMADO'].includes(turno.estado)) {
    throw new AppError(`No se puede cancelar un turno en estado ${turno.estado}.`, 400);
  }

  // Validar límite mínimo de anticipación (24 horas)
  const ahora = new Date();
  const horasDiferencia = (turno.fechaHora.getTime() - ahora.getTime()) / (1000 * 60 * 60);

  if (horasDiferencia < 24) {
    throw new AppError('El plazo para realizar cambios ha vencido (mínimo 24 horas de anticipación).', 400);
  }

  const turnoCancelado = await prisma.turno.update({
    where: { idTurno },
    data: {
      estado: 'CANCELADO',
      motivoCancelacion: 'Cancelado por el paciente desde panel web',
    },
  });

  // Aquí se podría registrar en auditoría también
  await prisma.auditoria.create({
    data: {
      idUsuario: usuarioAutenticado.idUsuario,
      fechaHora: new Date(),
      accion: 'CANCELAR_TURNO',
      tablaAfectada: 'turno',
      idRegistroAfectado: idTurno,
      descripcion: 'Turno cancelado por el paciente.',
    },
  });

  return {
    mensaje: 'Tu turno fue cancelado correctamente.',
    turno: turnoCancelado,
  };
}

/**
 * Reprogramar un turno.
 * Requiere que la fecha del turno supere el límite mínimo de anticipación (24 horas).
 */
export async function reprogramarTurno(
  idTurno: number,
  nuevaFechaHora: Date,
  usuarioAutenticado: AccessTokenPayload
) {
  const turnoOriginal = await prisma.turno.findUnique({
    where: { idTurno },
    include: { 
      paciente: {
        include: {
          usuario: true,
          plan: {
            include: {
              obraSocial: true,
            },
          },
        },
      }
    },
  });

  if (!turnoOriginal) {
    throw new AppError('Turno no encontrado.', 404);
  }

  // 1. VALIDACIÓN CRÍTICA: Verificar si el paciente tiene email, sexo y obra social/plan.
  verificarPerfilCompletoParaTurno(turnoOriginal.paciente);

  // Validar permisos
  if (usuarioAutenticado.rolActivo === 'PACIENTE') {
    const paciente = await prisma.paciente.findUnique({
      where: { idUsuario: usuarioAutenticado.idUsuario },
    });
    if (!paciente || paciente.idPaciente !== turnoOriginal.idPaciente) {
      throw new AppError('No tiene permisos para reprogramar este turno.', 403);
    }
  }

  // Validar estados permitidos
  if (!['SOLICITADO', 'CONFIRMADO'].includes(turnoOriginal.estado)) {
    throw new AppError(`No se puede reprogramar un turno en estado ${turnoOriginal.estado}.`, 400);
  }

  // Validar límite mínimo de anticipación (24 horas) para el turno original
  const ahora = new Date();
  const horasDiferencia = (turnoOriginal.fechaHora.getTime() - ahora.getTime()) / (1000 * 60 * 60);

  if (horasDiferencia < 24) {
    throw new AppError('El plazo para realizar cambios ha vencido (mínimo 24 horas de anticipación).', 400);
  }

  // Verificar si hay turno superpuesto en la nueva fecha (opcionalmente ya lo hace la DB con índice)
  const turnoExistente = await prisma.turno.findFirst({
    where: {
      idProfesional: turnoOriginal.idProfesional,
      fechaHora: nuevaFechaHora,
      estado: {
        in: ['SOLICITADO', 'CONFIRMADO'],
      },
    },
  });

  if (turnoExistente) {
    throw new AppError('El profesional ya cuenta con un turno reservado para esa nueva fecha y hora.', 409);
  }

  // Transacción para reprogramar: marcar original como REPROGRAMADO y crear nuevo SOLICITADO
  let nuevoTurno;
  await prisma.$transaction(async (tx) => {
    await tx.turno.update({
      where: { idTurno },
      data: {
        estado: 'REPROGRAMADO',
      },
    });

    nuevoTurno = await tx.turno.create({
      data: {
        idPaciente: turnoOriginal.idPaciente,
        idProfesional: turnoOriginal.idProfesional,
        fechaHora: nuevaFechaHora,
        estado: 'SOLICITADO',
      },
    });

    // Auditoría
    await tx.auditoria.create({
      data: {
        idUsuario: usuarioAutenticado.idUsuario,
        fechaHora: new Date(),
        accion: 'REPROGRAMAR_TURNO',
        tablaAfectada: 'turno',
        idRegistroAfectado: nuevoTurno.idTurno,
        descripcion: `Turno reprogramado del ${turnoOriginal.fechaHora.toISOString()} al ${nuevaFechaHora.toISOString()}`,
      },
    });
  });

  return {
    mensaje: 'Tu turno fue reprogramado correctamente.',
    turno: nuevoTurno,
  };
}
