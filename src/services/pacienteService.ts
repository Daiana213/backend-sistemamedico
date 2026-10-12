import { prisma } from '../config/prisma';
import { hashPassword } from '../utils/password';
import { calcularEdad } from '../utils/edad';
import { AppError } from '../utils/AppError';
import {
  RegistrarPacienteInput,
  ActualizarPerfilPacienteInput,
} from '../validations/pacienteValidation';

const MENSAJE_DNI_DUPLICADO =
  'El DNI ingresado ya se encuentra registrado en el sistema.';
const MENSAJE_ADULTO_NO_REGISTRADO =
  'El DNI del adulto responsable no se encuentra registrado en el sistema.';

interface ArchivoDocumento {
  nombreArchivo: string;
  rutaArchivo: string;
}

export async function registrarPaciente(datos: RegistrarPacienteInput, archivo?: ArchivoDocumento) {
  const usuarioExistente = await prisma.usuario.findUnique({
    where: { dni: datos.dni },
    include: { paciente: true },
  });

  if (usuarioExistente) {
    // Ya es paciente — ir al login
    if (usuarioExistente.paciente) {
      throw new AppError(MENSAJE_DNI_DUPLICADO, 409);
    }

    // Tiene otro rol — agregamos rol paciente al usuario existente
    return agregarRolPaciente(usuarioExistente.idUsuario, datos, archivo);
  }

  if (datos.idPlan) {
    const plan = await prisma.plan.findFirst({
      where: {
        idPlan: datos.idPlan,
        ...(datos.idObraSocial ? { idObraSocial: datos.idObraSocial } : {}),
        estado: 'ACTIVO',
      },
    });
    if (!plan) {
      throw new AppError('La obra social y el plan seleccionados no son válidos.', 400);
    }
  }

  if (datos.email) {
    const usuarioConEmail = await prisma.usuario.findFirst({
      where: { email: datos.email },
    });
    if (usuarioConEmail) {
      throw new AppError('El correo electrónico ingresado ya se encuentra registrado.', 409);
    }
  }

  const rolPaciente = await prisma.rol.findFirst({ where: { nombre: 'PACIENTE' } });
  if (!rolPaciente) {
    throw new AppError('No se encontró el rol PACIENTE configurado en el sistema.', 500);
  }

  const esMenor = calcularEdad(datos.fechaNacimiento) < 18;

  if (!esMenor) {
    return registrarPacienteAdulto(datos, rolPaciente.idRol);
  }

  return registrarPacienteMenor(datos, rolPaciente.idRol, archivo);
}

// ─── Usuario existente con otro rol ──────────────────────────────────────────

async function agregarRolPaciente(
  idUsuario: number,
  datos: RegistrarPacienteInput,
  archivo?: ArchivoDocumento
) {
  if (datos.idPlan) {
    const plan = await prisma.plan.findFirst({
      where: {
        idPlan: datos.idPlan,
        ...(datos.idObraSocial ? { idObraSocial: datos.idObraSocial } : {}),
        estado: 'ACTIVO',
      },
    });
    if (!plan) {
      throw new AppError('La obra social y el plan seleccionados no son válidos.', 400);
    }
  }

  const rolPaciente = await prisma.rol.findFirst({ where: { nombre: 'PACIENTE' } });
  if (!rolPaciente) {
    throw new AppError('No se encontró el rol PACIENTE configurado en el sistema.', 500);
  }

  const esMenor = calcularEdad(datos.fechaNacimiento) < 18;

  await prisma.$transaction(async (tx) => {
    const nuevoPaciente = await tx.paciente.create({
      data: {
        idUsuario,
        fechaNacimiento: datos.fechaNacimiento,
        sexo: datos.sexo ?? null,
        idPlan: datos.idPlan ?? null,
        estado: esMenor ? 'PENDIENTE_APROBACION' : 'ACTIVO',
        fechaRegistro: new Date(),
        telefonoAlternativo: datos.telefonoAlternativo ?? null,
        emailAlternativo: datos.emailAlternativo ?? null,
      },
    });

    await tx.usuarioRol.create({
      data: {
        idUsuario,
        idRol: rolPaciente.idRol,
        estado: 'ACTIVO',
        fechaAsignacion: new Date(),
      },
    });

    if (esMenor) {
      if (!archivo) throw new AppError('Debe cargar el documento', 400);

      const usuarioResponsable = await tx.usuario.findUnique({
        where: { dni: datos.dniResponsable! },
        include: { paciente: true },
      });

      if (!usuarioResponsable?.paciente) {
        throw new AppError(MENSAJE_ADULTO_NO_REGISTRADO, 404);
      }

      await tx.pacienteResponsable.create({
        data: {
          idPaciente: nuevoPaciente.idPaciente,
          idResponsable: usuarioResponsable.paciente.idPaciente,
          parentesco: datos.parentesco!,
          fechaInicio: new Date(),
          estado: 'ACTIVO',
        },
      });

      await tx.documentoResponsable.create({
        data: {
          idPaciente: nuevoPaciente.idPaciente,
          idResponsable: usuarioResponsable.paciente.idPaciente,
          tipoDocumento: datos.tipoDocumento!,
          nombreArchivo: archivo.nombreArchivo,
          rutaArchivo: archivo.rutaArchivo,
          fechaCarga: new Date(),
          estadoValidacion: 'PENDIENTE',
        },
      });
    }
  });

  return {
    idUsuario,
    mensaje: esMenor
      ? 'Registro recibido. Queda pendiente de aprobación por el administrador.'
      : 'Registro completado con éxito.',
  };
}
// Escenario 1: registro de un paciente adulto, alta directa
async function registrarPacienteAdulto(datos: RegistrarPacienteInput, idRol: number) {
  const passwordHash = await hashPassword(datos.password);

  const usuario = await prisma.$transaction(async (tx) => {
    const nuevoUsuario = await tx.usuario.create({
      data: {
        dni: datos.dni,
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: datos.telefono,
        email: datos.email ?? null,
        passwordHash,
        estado: 'ACTIVO',
        fechaAlta: new Date(),
        primerLogin: false,
      },
    });

    await tx.paciente.create({
      data: {
        idUsuario: nuevoUsuario.idUsuario,
        fechaNacimiento: datos.fechaNacimiento,
        sexo: datos.sexo ?? null,
        idPlan: datos.idPlan ?? null,
        estado: 'ACTIVO',
        fechaRegistro: new Date(),
      },
    });

    await tx.usuarioRol.create({
      data: { idUsuario: nuevoUsuario.idUsuario, idRol, estado: 'ACTIVO', fechaAsignacion: new Date() },
    });

    return nuevoUsuario;
  });

  return { idUsuario: usuario.idUsuario, mensaje: 'Registro completado con éxito' };
}

// Escenarios 4.1 y 4.2: registro de un menor con adulto responsable
async function registrarPacienteMenor(
  datos: RegistrarPacienteInput,
  idRol: number,
  archivo?: ArchivoDocumento
) {
  if (!archivo) {
    throw new AppError('Debe cargar el documento', 400);
  }

  // Escenario 4.2: el DNI del adulto responsable debe pertenecer a un paciente ya registrado
  const usuarioResponsable = await prisma.usuario.findUnique({
    where: { dni: datos.dniResponsable! },
    include: { paciente: true },
  });

  if (!usuarioResponsable || !usuarioResponsable.paciente) {
    throw new AppError(MENSAJE_ADULTO_NO_REGISTRADO, 404);
  }

  const passwordHash = await hashPassword(datos.password);

  const usuario = await prisma.$transaction(async (tx) => {
    const nuevoUsuario = await tx.usuario.create({
      data: {
        dni: datos.dni,
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: datos.telefono,
        email: datos.email ?? null,
        passwordHash,
        estado: 'ACTIVO',
        fechaAlta: new Date(),
        primerLogin: false,
      },
    });

    const nuevoPaciente = await tx.paciente.create({
      data: {
        idUsuario: nuevoUsuario.idUsuario,
        fechaNacimiento: datos.fechaNacimiento,
        sexo: datos.sexo ?? null,
        idPlan: datos.idPlan ?? null,
        estado: 'PENDIENTE_APROBACION', // Escenario 4.1: queda pendiente de aprobación por el administrador
        fechaRegistro: new Date(),
      },
    });

    await tx.usuarioRol.create({
      data: { idUsuario: nuevoUsuario.idUsuario, idRol, estado: 'ACTIVO', fechaAsignacion: new Date() },
    });

    await tx.pacienteResponsable.create({
      data: {
        idPaciente: nuevoPaciente.idPaciente,
        idResponsable: usuarioResponsable.paciente!.idPaciente,
        parentesco: datos.parentesco!,
        fechaInicio: new Date(),
        estado: 'ACTIVO',
      },
    });

    await tx.documentoResponsable.create({
      data: {
        idPaciente: nuevoPaciente.idPaciente,
        idResponsable: usuarioResponsable.paciente!.idPaciente,
        tipoDocumento: datos.tipoDocumento!,
        nombreArchivo: archivo.nombreArchivo,
        rutaArchivo: archivo.rutaArchivo,
        fechaCarga: new Date(),
        estadoValidacion: 'PENDIENTE',
      },
    });

    return nuevoUsuario;
  });

  return {
    idUsuario: usuario.idUsuario,
    mensaje: 'Registro recibido. Queda pendiente de aprobación por el administrador.',
  };
}

// ─── Perfil de Paciente ───────────────────────────────────────────────────────

export async function actualizarPerfilPaciente(
  idUsuario: number,
  datos: ActualizarPerfilPacienteInput
) {
  const paciente = await prisma.paciente.findUnique({
    where: { idUsuario },
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
    throw new AppError('No se encontró el perfil de paciente asociado a este usuario.', 404);
  }

  // Si se envió email, verificar que no esté duplicado en otro usuario
  if (datos.email && datos.email !== paciente.usuario.email) {
    const usuarioConEmail = await prisma.usuario.findFirst({
      where: {
        email: datos.email,
        idUsuario: { not: idUsuario },
      },
    });

    if (usuarioConEmail) {
      throw new AppError('El correo electrónico ingresado ya se encuentra registrado por otro usuario.', 409);
    }
  }

  // Si se envió idPlan, validar que exista activo
  if (datos.idPlan) {
    const plan = await prisma.plan.findFirst({
      where: {
        idPlan: datos.idPlan,
        ...(datos.idObraSocial ? { idObraSocial: datos.idObraSocial } : {}),
        estado: 'ACTIVO',
      },
    });

    if (!plan) {
      throw new AppError('El plan o la obra social seleccionada no es válida o no está activa.', 400);
    }
  }

  // Actualización en transacción
  await prisma.$transaction(async (tx) => {
    if (datos.email !== undefined || datos.telefono !== undefined) {
      await tx.usuario.update({
        where: { idUsuario },
        data: {
          ...(datos.email !== undefined ? { email: datos.email } : {}),
          ...(datos.telefono !== undefined ? { telefono: datos.telefono } : {}),
        },
      });
    }

    if (
      datos.sexo !== undefined ||
      datos.idPlan !== undefined ||
      datos.telefonoAlternativo !== undefined ||
      datos.emailAlternativo !== undefined
    ) {
      await tx.paciente.update({
        where: { idPaciente: paciente.idPaciente },
        data: {
          ...(datos.sexo !== undefined ? { sexo: datos.sexo } : {}),
          ...(datos.idPlan !== undefined ? { idPlan: datos.idPlan } : {}),
          ...(datos.telefonoAlternativo !== undefined ? { telefonoAlternativo: datos.telefonoAlternativo } : {}),
          ...(datos.emailAlternativo !== undefined ? { emailAlternativo: datos.emailAlternativo } : {}),
        },
      });
    }
  });

  // Retornar perfil actualizado
  const pacienteActualizado = await prisma.paciente.findUnique({
    where: { idPaciente: paciente.idPaciente },
    include: {
      usuario: {
        select: {
          idUsuario: true,
          dni: true,
          nombre: true,
          apellido: true,
          email: true,
          telefono: true,
          estado: true,
        },
      },
      plan: {
        include: {
          obraSocial: true,
        },
      },
    },
  });

  const perfilCompleto = Boolean(
    pacienteActualizado?.usuario.email &&
    pacienteActualizado?.sexo &&
    pacienteActualizado?.idPlan
  );

  return {
    mensaje: 'Perfil de paciente actualizado exitosamente.',
    perfilCompleto,
    paciente: pacienteActualizado,
  };
}

export async function obtenerPerfilPaciente(idUsuario: number) {
  const paciente = await prisma.paciente.findUnique({
    where: { idUsuario },
    include: {
      usuario: {
        select: {
          idUsuario: true,
          dni: true,
          nombre: true,
          apellido: true,
          email: true,
          telefono: true,
          estado: true,
        },
      },
      plan: {
        include: {
          obraSocial: true,
        },
      },
    },
  });

  if (!paciente) {
    throw new AppError('No se encontró el perfil de paciente asociado a este usuario.', 404);
  }

  const faltantes: string[] = [];
  if (!paciente.usuario.email) faltantes.push('email');
  if (!paciente.sexo) faltantes.push('sexo');
  if (!paciente.idPlan) faltantes.push('obraSocial/plan');

  return {
    paciente,
    perfilCompleto: faltantes.length === 0,
    camposFaltantes: faltantes,
  };
}

/**
 * Valida si el paciente cuenta con todos los datos requeridos para poder solicitar o reservar un turno:
 * - Email (en Usuario)
 * - Sexo (en Paciente)
 * - Obra social / Plan (en Paciente)
 * Si falta alguno, arroja un AppError con código 403.
 */
export function verificarPerfilCompletoParaTurno(paciente: {
  usuario?: { email: string | null } | null;
  sexo: string | null;
  idPlan: number | null;
}) {
  const camposFaltantes: string[] = [];

  if (!paciente.usuario?.email) {
    camposFaltantes.push('correo electrónico (email)');
  }
  if (!paciente.sexo) {
    camposFaltantes.push('sexo');
  }
  if (!paciente.idPlan) {
    camposFaltantes.push('obra social / plan');
  }

  if (camposFaltantes.length > 0) {
    throw new AppError(
      `Para solicitar un turno debe completar los siguientes datos obligatorios de su perfil: ${camposFaltantes.join(
        ', '
      )}. Por favor, actualice sus datos en /api/pacientes/perfil antes de continuar.`,
      403,
      {
        camposFaltantes,
        requiereCompletarPerfil: true,
      }
    );
  }
}

export async function buscarPacientePorDni(dni: string) {
  const paciente = await prisma.paciente.findFirst({
    where: {
      usuario: { dni },
    },
    include: {
      usuario: {
        select: {
          nombre: true,
          apellido: true,
          dni: true,
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
  });

  if (!paciente) {
    throw new AppError('No se encontró ningún paciente con el DNI proporcionado.', 404);
  }

  const perfilCompleto = Boolean(paciente.usuario.email && paciente.sexo && paciente.idPlan);

  return {
    idPaciente: paciente.idPaciente,
    nombreCompleto: `${paciente.usuario.nombre} ${paciente.usuario.apellido}`,
    dni: paciente.usuario.dni,
    telefono: paciente.usuario.telefono,
    email: paciente.usuario.email,
    planObraSocial: paciente.plan
      ? `${paciente.plan.obraSocial.nombre} - ${paciente.plan.nombre}`
      : 'Particular',
    estado: paciente.estado,
    perfilCompleto,
  };
}