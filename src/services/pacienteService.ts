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

export function evaluarEstadoPerfilPaciente(paciente: {
  usuario?: { email: string | null } | null;
  sexo: string | null;
  idPlan: number | null;
  numeroAfiliado?: string | null;
}) {
  const camposFaltantes: string[] = [];

  if (!paciente.usuario?.email) {
    camposFaltantes.push('email');
  }
  if (!paciente.sexo) {
    camposFaltantes.push('sexo');
  }
  if (paciente.idPlan && paciente.numeroAfiliado !== undefined && !paciente.numeroAfiliado) {
    camposFaltantes.push('numeroAfiliado');
  }

  const tieneObraSocial = Boolean(paciente.idPlan);

  return {
    perfilCompleto: camposFaltantes.length === 0,
    camposFaltantes,
    tieneObraSocial,
    modalidadCobertura: tieneObraSocial ? ('CON_OBRA_SOCIAL' as const) : ('PARTICULAR' as const),
  };
}

export async function registrarPaciente(datos: RegistrarPacienteInput, archivo?: ArchivoDocumento) {
  const usuarioExistente = await prisma.usuario.findUnique({
    where: { dni: datos.dni },
    include: { paciente: true },
  });

  if (usuarioExistente) {
    if (usuarioExistente.paciente) {
      throw new AppError(MENSAJE_DNI_DUPLICADO, 409);
    }

    return agregarRolPaciente(usuarioExistente.idUsuario, datos, archivo);
  }

  const sinObraSocial = datos.tieneObraSocial === false || !datos.idPlan;

  if (!sinObraSocial && datos.idPlan) {
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

async function agregarRolPaciente(
  idUsuario: number,
  datos: RegistrarPacienteInput,
  archivo?: ArchivoDocumento
) {
  const sinObraSocial = datos.tieneObraSocial === false || !datos.idPlan;

  if (!sinObraSocial && datos.idPlan) {
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
        idPlan: sinObraSocial ? null : (datos.idPlan ?? null),
        numeroAfiliado: sinObraSocial ? null : (datos.numeroAfiliado ?? null),
        subfijoAdherente: sinObraSocial ? null : (datos.subfijoAdherente ?? null),
        vencimientoCredencial: sinObraSocial ? null : (datos.vencimientoCredencial ?? null),
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

async function registrarPacienteAdulto(datos: RegistrarPacienteInput, idRol: number) {
  const passwordHash = await hashPassword(datos.password);
  const sinObraSocial = datos.tieneObraSocial === false || !datos.idPlan;

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
        idPlan: sinObraSocial ? null : (datos.idPlan ?? null),
        numeroAfiliado: sinObraSocial ? null : (datos.numeroAfiliado ?? null),
        subfijoAdherente: sinObraSocial ? null : (datos.subfijoAdherente ?? null),
        vencimientoCredencial: sinObraSocial ? null : (datos.vencimientoCredencial ?? null),
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

async function registrarPacienteMenor(
  datos: RegistrarPacienteInput,
  idRol: number,
  archivo?: ArchivoDocumento
) {
  if (!archivo) {
    throw new AppError('Debe cargar el documento', 400);
  }

  const usuarioResponsable = await prisma.usuario.findUnique({
    where: { dni: datos.dniResponsable! },
    include: { paciente: true },
  });

  if (!usuarioResponsable || !usuarioResponsable.paciente) {
    throw new AppError(MENSAJE_ADULTO_NO_REGISTRADO, 404);
  }

  const passwordHash = await hashPassword(datos.password);
  const sinObraSocial = datos.tieneObraSocial === false || !datos.idPlan;

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
        idPlan: sinObraSocial ? null : (datos.idPlan ?? null),
        numeroAfiliado: sinObraSocial ? null : (datos.numeroAfiliado ?? null),
        subfijoAdherente: sinObraSocial ? null : (datos.subfijoAdherente ?? null),
        vencimientoCredencial: sinObraSocial ? null : (datos.vencimientoCredencial ?? null),
        estado: 'PENDIENTE_APROBACION',
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

  const eliminaObraSocial =
    datos.tieneObraSocial === false || datos.idObraSocial === null || datos.idPlan === null;

  if (!eliminaObraSocial && datos.idPlan) {
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

    const datosPacienteUpdate: Record<string, unknown> = {};

    if (datos.sexo !== undefined) {
      datosPacienteUpdate.sexo = datos.sexo;
    }
    if (datos.telefonoAlternativo !== undefined) {
      datosPacienteUpdate.telefonoAlternativo = datos.telefonoAlternativo;
    }
    if (datos.emailAlternativo !== undefined) {
      datosPacienteUpdate.emailAlternativo = datos.emailAlternativo;
    }

    if (eliminaObraSocial) {
      datosPacienteUpdate.idPlan = null;
      datosPacienteUpdate.numeroAfiliado = null;
      datosPacienteUpdate.subfijoAdherente = null;
      datosPacienteUpdate.vencimientoCredencial = null;
    } else {
      if (datos.idPlan !== undefined) {
        datosPacienteUpdate.idPlan = datos.idPlan;
      }
      if (datos.numeroAfiliado !== undefined) {
        datosPacienteUpdate.numeroAfiliado = datos.numeroAfiliado;
      }
      if (datos.subfijoAdherente !== undefined) {
        datosPacienteUpdate.subfijoAdherente = datos.subfijoAdherente;
      }
      if (datos.vencimientoCredencial !== undefined) {
        datosPacienteUpdate.vencimientoCredencial = datos.vencimientoCredencial;
      }
    }

    if (Object.keys(datosPacienteUpdate).length > 0) {
      await tx.paciente.update({
        where: { idPaciente: paciente.idPaciente },
        data: datosPacienteUpdate,
      });
    }
  });

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

  const estadoPerfil = evaluarEstadoPerfilPaciente(
    pacienteActualizado ?? {
      usuario: null,
      sexo: null,
      idPlan: null,
      numeroAfiliado: null,
    }
  );

  if (estadoPerfil.perfilCompleto && paciente.usuario.primerLogin) {
    await prisma.usuario.update({
      where: { idUsuario },
      data: { primerLogin: false },
    });
  }

  return {
    mensaje: 'Perfil de paciente actualizado exitosamente.',
    perfilCompleto: estadoPerfil.perfilCompleto,
    camposFaltantes: estadoPerfil.camposFaltantes,
    tieneObraSocial: estadoPerfil.tieneObraSocial,
    modalidadCobertura: estadoPerfil.modalidadCobertura,
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

  const estadoPerfil = evaluarEstadoPerfilPaciente(paciente);

  return {
    paciente,
    perfilCompleto: estadoPerfil.perfilCompleto,
    camposFaltantes: estadoPerfil.camposFaltantes,
    tieneObraSocial: estadoPerfil.tieneObraSocial,
    modalidadCobertura: estadoPerfil.modalidadCobertura,
  };
}

export function verificarPerfilCompletoParaTurno(
  paciente: {
    usuario?: { email: string | null } | null;
    sexo: string | null;
    idPlan: number | null;
    numeroAfiliado?: string | null;
  },
  esAdmin = false
) {
  const camposFaltantes: string[] = [];

  if (!paciente.usuario?.email) {
    camposFaltantes.push('correo electrónico (email)');
  }
  if (!paciente.sexo) {
    camposFaltantes.push('sexo');
  }
  if (paciente.idPlan && paciente.numeroAfiliado !== undefined && !paciente.numeroAfiliado) {
    camposFaltantes.push('número de afiliado de la obra social');
  }

  if (camposFaltantes.length > 0) {
    const mensaje = esAdmin
      ? 'El paciente debe completar sus datos antes de agendar un turno.'
      : 'Para sacar un turno primero tenés que completar tus datos.';

    throw new AppError(
      mensaje,
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

  const estadoPerfil = evaluarEstadoPerfilPaciente(paciente);

  return {
    idPaciente: paciente.idPaciente,
    nombreCompleto: `${paciente.usuario.nombre} ${paciente.usuario.apellido}`,
    dni: paciente.usuario.dni,
    telefono: paciente.usuario.telefono,
    email: paciente.usuario.email,
    planObraSocial: paciente.plan
      ? `${paciente.plan.obraSocial.nombre} - ${paciente.plan.nombre}`
      : 'Particular',
    tieneObraSocial: estadoPerfil.tieneObraSocial,
    modalidadCobertura: estadoPerfil.modalidadCobertura,
    estado: paciente.estado,
    perfilCompleto: estadoPerfil.perfilCompleto,
    camposFaltantes: estadoPerfil.camposFaltantes,
  };
}
