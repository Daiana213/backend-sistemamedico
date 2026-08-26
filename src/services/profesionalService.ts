import { prisma } from '../config/prisma';
import { hashPassword } from '../utils/password';
import { AppError } from '../utils/AppError';
import { RegistrarProfesionalInput } from '../validations/profesionalValidation';

function generarPasswordGenerica(): string {
  const mayusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const minusculas = 'abcdefghijklmnopqrstuvwxyz';
  const numeros = '0123456789';
  const simbolos = '!@#$%&*';
  const todos = mayusculas + minusculas + numeros + simbolos;

  const aleatorio = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

  const passwordArray = [
    aleatorio(mayusculas),
    aleatorio(minusculas),
    aleatorio(numeros),
    aleatorio(simbolos),
    ...Array.from({ length: 8 }, () => aleatorio(todos)),
  ];

  return passwordArray.sort(() => Math.random() - 0.5).join('');
}

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
  const passwordGenerica = generarPasswordGenerica();
  const passwordHash = await hashPassword(passwordGenerica);

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
    passwordGenerica,
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
  const passwordGenerica = generarPasswordGenerica();
  const passwordHash = await hashPassword(passwordGenerica);

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
    passwordGenerica,
  };
}