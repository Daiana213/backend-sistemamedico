import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { EspecialidadInput } from '../validations/especialidadValidation';

export async function listarEspecialidades(incluirInactivas = false) {
  const whereClause: any = {};
  if (!incluirInactivas) {
    whereClause.estado = 'ACTIVO';
  }

  return prisma.especialidad.findMany({
    where: whereClause,
    select: {
      idEspecialidad: true,
      nombre: true,
      descripcion: true,
      estado: true,
    },
    orderBy: { nombre: 'asc' },
  });
}

export async function obtenerEspecialidadPorId(idEspecialidad: number) {
  const especialidad = await prisma.especialidad.findUnique({
    where: { idEspecialidad },
  });

  if (!especialidad) {
    throw new AppError('Especialidad no encontrada.', 404);
  }

  return especialidad;
}

export async function crearEspecialidad(
  datos: EspecialidadInput,
  idAdministrativo: number,
  ip?: string
) {
  const existente = await prisma.especialidad.findUnique({
    where: { nombre: datos.nombre },
  });

  if (existente) {
    if (existente.estado === 'ACTIVO') {
      throw new AppError('Ya existe una especialidad con ese nombre.', 409);
    }

    // Reactivar especialidad inactiva existente
    const reactivada = await prisma.$transaction(async (tx) => {
      const esp = await tx.especialidad.update({
        where: { idEspecialidad: existente.idEspecialidad },
        data: {
          estado: 'ACTIVO',
          descripcion: datos.descripcion ?? null,
        },
      });

      await tx.auditoria.create({
        data: {
          idUsuario: idAdministrativo,
          fechaHora: new Date(),
          accion: 'ALTA_ESPECIALIDAD',
          tablaAfectada: 'especialidad',
          idRegistroAfectado: esp.idEspecialidad,
          datosAnteriores: JSON.stringify({ estado: 'INACTIVO' }),
          datosNuevos: JSON.stringify(esp),
          ip,
          descripcion: `Reactivación / Alta de especialidad ${esp.nombre}.`,
        },
      });

      return esp;
    });

    return {
      mensaje: 'Especialidad agregada correctamente.',
      especialidad: reactivada,
    };
  }

  const nueva = await prisma.$transaction(async (tx) => {
    const esp = await tx.especialidad.create({
      data: {
        nombre: datos.nombre,
        descripcion: datos.descripcion ?? null,
        estado: 'ACTIVO',
      },
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'ALTA_ESPECIALIDAD',
        tablaAfectada: 'especialidad',
        idRegistroAfectado: esp.idEspecialidad,
        datosNuevos: JSON.stringify(esp),
        ip,
        descripcion: `Alta de especialidad ${esp.nombre}.`,
      },
    });

    return esp;
  });

  return {
    mensaje: 'Especialidad agregada correctamente.',
    especialidad: nueva,
  };
}

export async function editarEspecialidad(
  idEspecialidad: number,
  datos: EspecialidadInput,
  idAdministrativo: number,
  ip?: string
) {
  const especialidad = await prisma.especialidad.findUnique({
    where: { idEspecialidad },
  });

  if (!especialidad) {
    throw new AppError('Especialidad no encontrada.', 404);
  }

  if (datos.nombre !== especialidad.nombre) {
    const existenteConNombre = await prisma.especialidad.findUnique({
      where: { nombre: datos.nombre },
    });
    if (existenteConNombre) {
      throw new AppError('Ya existe una especialidad con ese nombre.', 409);
    }
  }

  const prevData = {
    nombre: especialidad.nombre,
    descripcion: especialidad.descripcion,
  };

  const actualizada = await prisma.$transaction(async (tx) => {
    const esp = await tx.especialidad.update({
      where: { idEspecialidad },
      data: {
        nombre: datos.nombre,
        descripcion: datos.descripcion ?? null,
      },
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'MODIFICACION_ESPECIALIDAD',
        tablaAfectada: 'especialidad',
        idRegistroAfectado: idEspecialidad,
        datosAnteriores: JSON.stringify(prevData),
        datosNuevos: JSON.stringify(datos),
        ip,
        descripcion: `Modificación de especialidad ${datos.nombre}.`,
      },
    });

    return esp;
  });

  return {
    mensaje: 'Especialidad actualizada correctamente.',
    especialidad: actualizada,
  };
}

export async function darDeBajaEspecialidad(
  idEspecialidad: number,
  idAdministrativo: number,
  ip?: string
) {
  const especialidad = await prisma.especialidad.findUnique({
    where: { idEspecialidad },
  });

  if (!especialidad) {
    throw new AppError('Especialidad no encontrada.', 404);
  }

  // Escenario 7: Verificar si posee profesionales activos asignados
  const profesionalesActivos = await prisma.profesionalEspecialidad.findMany({
    where: {
      idEspecialidad,
      estado: 'ACTIVO',
      profesional: {
        estado: 'ACTIVO',
      },
    },
    include: {
      profesional: {
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
  });

  if (profesionalesActivos.length > 0) {
    throw new AppError(
      'No es posible eliminar la especialidad porque está asignada a uno o más profesionales activos...',
      409,
      {
        profesionalesAsignados: profesionalesActivos.map((p) => ({
          idProfesional: p.profesional.idProfesional,
          nombreCompleto: `${p.profesional.usuario.nombre} ${p.profesional.usuario.apellido}`,
          matricula: p.profesional.matricula,
        })),
      }
    );
  }

  // Escenario 8: Baja lógica sin profesionales asignados
  await prisma.$transaction(async (tx) => {
    await tx.especialidad.update({
      where: { idEspecialidad },
      data: {
        estado: 'INACTIVO',
      },
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'BAJA_LOGICA_ESPECIALIDAD',
        tablaAfectada: 'especialidad',
        idRegistroAfectado: idEspecialidad,
        datosAnteriores: JSON.stringify({ estado: especialidad.estado }),
        datosNuevos: JSON.stringify({ estado: 'INACTIVO' }),
        ip,
        descripcion: `Baja lógica de especialidad ${especialidad.nombre}.`,
      },
    });
  });

  return {
    mensaje: 'La especialidad ha sido dada de baja correctamente.',
  };
}
