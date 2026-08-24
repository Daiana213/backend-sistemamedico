import { prisma } from '../config/prisma';
import { hashPassword } from '../utils/password';
import { AppError } from '../utils/AppError';
import { RegistrarPacienteInput } from '../validations/pacienteValidation';

const MENSAJE_DNI_DUPLICADO =
  'El DNI ingresado ya se encuentra registrado en el sistema. Volvé al inicio de sesión.';

export async function registrarPaciente(datos: RegistrarPacienteInput) {
  // Escenario 3: DNI ya registrado (a nivel usuario, no solo paciente,
  // porque el mismo DNI no puede tener dos identidades distintas en el sistema)
  const usuarioExistente = await prisma.usuario.findUnique({
    where: { dni: datos.dni },
  });

  if (usuarioExistente) {
    throw new AppError(MENSAJE_DNI_DUPLICADO, 409);
  }

  // Validamos que el plan exista, esté activo y realmente pertenezca
  // a la obra social seleccionada (evita un plan_id "suelto" mandado a mano)
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

  const passwordHash = await hashPassword(datos.password);

  // Transacción: si falla cualquiera de las 3 escrituras, no queda un usuario
  // "huérfano" sin fila de paciente o sin rol asignado
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
        estado: 'ACTIVO', // adulto: alta directa, sin aprobación (eso es solo para menores, HU1 4.1/4.2)
        fechaRegistro: new Date(),
      },
    });

    await tx.usuarioRol.create({
      data: {
        idUsuario: nuevoUsuario.idUsuario,
        idRol: rolPaciente.idRol,
        estado: 'ACTIVO',
        fechaAsignacion: new Date(),
      },
    });

    return nuevoUsuario;
  });

  return {
    idUsuario: usuario.idUsuario,
    mensaje: 'Registro completado con éxito',
  };
}