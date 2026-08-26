import { prisma } from '../config/prisma';
import { hashPassword } from '../utils/password';
import { calcularEdad } from '../utils/edad';
import { AppError } from '../utils/AppError';
import { RegistrarPacienteInput } from '../validations/pacienteValidation';

const MENSAJE_DNI_DUPLICADO =
  'El DNI ingresado ya se encuentra registrado en el sistema. Volvé al inicio de sesión.';
const MENSAJE_ADULTO_NO_REGISTRADO =
  'El DNI del adulto responsable no se encuentra registrado en el sistema. Por favor, registrelo primero.';

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

  const plan = await prisma.plan.findFirst({
    where: { idPlan: datos.idPlan, idObraSocial: datos.idObraSocial, estado: 'ACTIVO' },
  });
  if (!plan) {
    throw new AppError('La obra social y el plan seleccionados no son válidos.', 400);
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
  const plan = await prisma.plan.findFirst({
    where: { idPlan: datos.idPlan, idObraSocial: datos.idObraSocial, estado: 'ACTIVO' },
  });
  if (!plan) {
    throw new AppError('La obra social y el plan seleccionados no son válidos.', 400);
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
        sexo: datos.sexo,
        idPlan: datos.idPlan,
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
        email: datos.email,
        passwordHash,
        estado: 'ACTIVO',
        fechaAlta: new Date(),
      },
    });

    await tx.paciente.create({
      data: {
        idUsuario: nuevoUsuario.idUsuario,
        fechaNacimiento: datos.fechaNacimiento,
        sexo: datos.sexo,
        idPlan: datos.idPlan,
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
        email: datos.email,
        passwordHash,
        estado: 'ACTIVO',
        fechaAlta: new Date(),
      },
    });

    const nuevoPaciente = await tx.paciente.create({
      data: {
        idUsuario: nuevoUsuario.idUsuario,
        fechaNacimiento: datos.fechaNacimiento,
        sexo: datos.sexo,
        idPlan: datos.idPlan,
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