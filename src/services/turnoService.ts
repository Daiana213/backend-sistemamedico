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

  // 5. Crear el nuevo turno
  const nuevoTurno = await prisma.turno.create({
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

  return {
    mensaje: 'Turno solicitado exitosamente.',
    turno: nuevoTurno,
  };
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
