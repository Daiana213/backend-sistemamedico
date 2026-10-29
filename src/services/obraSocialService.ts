import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { ObraSocialInput, PlanInput } from '../validations/obraSocialValidation';

/**
 * Lista las obras sociales.
 * Por defecto devuelve solo las ACTIVAS (para selectores de pacientes y turnos - Escenario 1 y 5).
 * Si incluirInactivas = true, devuelve todas junto con sus planes para gestión administrativa.
 */
export async function listarObrasSocialesActivas(incluirInactivas = false) {
  const whereClause = incluirInactivas ? {} : { estado: 'ACTIVO' as const };

  return prisma.obraSocial.findMany({
    where: whereClause,
    orderBy: { nombre: 'asc' },
    select: {
      idObraSocial: true,
      nombre: true,
      descripcion: true,
      estado: true,
      planes: {
        where: incluirInactivas ? {} : { estado: 'ACTIVO' },
        orderBy: { nombre: 'asc' },
        select: {
          idPlan: true,
          idObraSocial: true,
          nombre: true,
          descripcion: true,
          estado: true,
        },
      },
    },
  });
}

/**
 * Obtiene una obra social por su ID incluyendo sus planes.
 */
export async function obtenerObraSocialPorId(idObraSocial: number, incluirInactivos = false) {
  const obraSocial = await prisma.obraSocial.findUnique({
    where: { idObraSocial },
    select: {
      idObraSocial: true,
      nombre: true,
      descripcion: true,
      estado: true,
      planes: {
        where: incluirInactivos ? {} : { estado: 'ACTIVO' },
        orderBy: { nombre: 'asc' },
        select: {
          idPlan: true,
          idObraSocial: true,
          nombre: true,
          descripcion: true,
          estado: true,
        },
      },
    },
  });

  if (!obraSocial) {
    throw new AppError('Obra social no encontrada.', 404);
  }

  return obraSocial;
}

/**
 * Lista los planes de una obra social.
 * Por defecto devuelve solo los planes ACTIVOS de una obra social (Escenario 2 y 5).
 */
export async function listarPlanesActivosPorObraSocial(
  idObraSocial: number,
  incluirInactivos = false
) {
  const obraSocial = await prisma.obraSocial.findUnique({
    where: { idObraSocial },
    select: { idObraSocial: true, nombre: true, estado: true },
  });

  if (!obraSocial) {
    throw new AppError('Obra social no encontrada.', 404);
  }

  if (!incluirInactivos && obraSocial.estado !== 'ACTIVO') {
    return [];
  }

  return prisma.plan.findMany({
    where: {
      idObraSocial,
      ...(incluirInactivos ? {} : { estado: 'ACTIVO' }),
    },
    orderBy: { nombre: 'asc' },
    select: {
      idPlan: true,
      idObraSocial: true,
      nombre: true,
      descripcion: true,
      estado: true,
    },
  });
}

/**
 * HU20 - Escenario 1 y 3: Alta de obra social con validación de duplicados y log de auditoría.
 */
export async function crearObraSocial(
  datos: ObraSocialInput,
  idAdministrativo: number,
  ip?: string
) {
  const existente = await prisma.obraSocial.findFirst({
    where: {
      nombre: {
        equals: datos.nombre,
        mode: 'insensitive',
      },
    },
  });

  if (existente) {
    throw new AppError('Ya existe una obra social con ese nombre.', 409, {
      nombre: 'Ya existe una obra social con ese nombre.',
    });
  }

  const nuevaObraSocial = await prisma.$transaction(async (tx) => {
    const creada = await tx.obraSocial.create({
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
        accion: 'ALTA_OBRA_SOCIAL',
        tablaAfectada: 'obra_social',
        idRegistroAfectado: creada.idObraSocial,
        datosNuevos: JSON.stringify(creada),
        ip,
        descripcion: `Alta de obra social ${creada.nombre}.`,
      },
    });

    return creada;
  });

  return {
    mensaje: 'Obra social agregada correctamente.',
    obraSocial: nuevaObraSocial,
  };
}

/**
 * HU20 - Escenario 3 y 4: Edición de obra social con actualización automática en registros vinculados y log de auditoría.
 */
export async function editarObraSocial(
  idObraSocial: number,
  datos: ObraSocialInput,
  idAdministrativo: number,
  ip?: string
) {
  const obraSocial = await prisma.obraSocial.findUnique({
    where: { idObraSocial },
  });

  if (!obraSocial) {
    throw new AppError('Obra social no encontrada.', 404);
  }

  const duplicada = await prisma.obraSocial.findFirst({
    where: {
      nombre: {
        equals: datos.nombre,
        mode: 'insensitive',
      },
      idObraSocial: {
        not: idObraSocial,
      },
    },
  });

  if (duplicada) {
    throw new AppError('Ya existe una obra social con ese nombre.', 409, {
      nombre: 'Ya existe una obra social con ese nombre.',
    });
  }

  const datosAnteriores = {
    nombre: obraSocial.nombre,
    descripcion: obraSocial.descripcion,
    estado: obraSocial.estado,
  };

  const actualizada = await prisma.$transaction(async (tx) => {
    const os = await tx.obraSocial.update({
      where: { idObraSocial },
      data: {
        nombre: datos.nombre,
        ...(datos.descripcion !== undefined ? { descripcion: datos.descripcion } : {}),
      },
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'MODIFICACION_OBRA_SOCIAL',
        tablaAfectada: 'obra_social',
        idRegistroAfectado: idObraSocial,
        datosAnteriores: JSON.stringify(datosAnteriores),
        datosNuevos: JSON.stringify({
          nombre: os.nombre,
          descripcion: os.descripcion,
          estado: os.estado,
        }),
        ip,
        descripcion: `Modificación de obra social ${datosAnteriores.nombre} a ${os.nombre}.`,
      },
    });

    return os;
  });

  return {
    mensaje: 'Obra social actualizada correctamente.',
    obraSocial: actualizada,
  };
}

/**
 * HU20 - Escenario 5: Baja lógica de obra social.
 * Pasa a INACTIVO y deja de aparecer en selectores sin afectar pacientes ni registros históricos.
 */
export async function darDeBajaObraSocial(
  idObraSocial: number,
  idAdministrativo: number,
  ip?: string
) {
  const obraSocial = await prisma.obraSocial.findUnique({
    where: { idObraSocial },
  });

  if (!obraSocial) {
    throw new AppError('Obra social no encontrada.', 404);
  }

  const actualizada = await prisma.$transaction(async (tx) => {
    const os = await tx.obraSocial.update({
      where: { idObraSocial },
      data: {
        estado: 'INACTIVO',
      },
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'BAJA_LOGICA_OBRA_SOCIAL',
        tablaAfectada: 'obra_social',
        idRegistroAfectado: idObraSocial,
        datosAnteriores: JSON.stringify({
          nombre: obraSocial.nombre,
          estado: obraSocial.estado,
        }),
        datosNuevos: JSON.stringify({
          nombre: os.nombre,
          estado: 'INACTIVO',
        }),
        ip,
        descripcion: `Baja lógica de obra social ${obraSocial.nombre}.`,
      },
    });

    return os;
  });

  return {
    mensaje: 'La obra social ha sido dada de baja correctamente.',
    obraSocial: actualizada,
  };
}

/**
 * HU20 - Escenario 2 y 3: Alta de un plan asociado a una obra social activa con log de auditoría.
 */
export async function crearPlanObraSocial(
  idObraSocial: number,
  datos: PlanInput,
  idAdministrativo: number,
  ip?: string
) {
  const obraSocial = await prisma.obraSocial.findUnique({
    where: { idObraSocial },
  });

  if (!obraSocial) {
    throw new AppError('Obra social no encontrada.', 404);
  }

  if (obraSocial.estado !== 'ACTIVO') {
    throw new AppError('No se puede agregar un plan a una obra social inactiva.', 400);
  }

  const planDuplicado = await prisma.plan.findFirst({
    where: {
      idObraSocial,
      nombre: {
        equals: datos.nombre,
        mode: 'insensitive',
      },
    },
  });

  if (planDuplicado) {
    throw new AppError('Ya existe un plan con ese nombre.', 409, {
      nombre: 'Ya existe un plan con ese nombre.',
    });
  }

  const nuevoPlan = await prisma.$transaction(async (tx) => {
    const plan = await tx.plan.create({
      data: {
        idObraSocial,
        nombre: datos.nombre,
        descripcion: datos.descripcion ?? null,
        estado: 'ACTIVO',
      },
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'ALTA_PLAN_OBRA_SOCIAL',
        tablaAfectada: 'plan',
        idRegistroAfectado: plan.idPlan,
        datosNuevos: JSON.stringify(plan),
        ip,
        descripcion: `Alta de plan ${plan.nombre} en obra social ${obraSocial.nombre}.`,
      },
    });

    return plan;
  });

  return {
    mensaje: 'Plan agregado correctamente.',
    plan: nuevoPlan,
  };
}

/**
 * HU20 - Escenario 3 y 4: Edición de un plan de obra social con log de auditoría.
 */
export async function editarPlanObraSocial(
  idPlan: number,
  datos: PlanInput,
  idAdministrativo: number,
  ip?: string,
  idObraSocialParam?: number
) {
  const planExistente = await prisma.plan.findUnique({
    where: { idPlan },
  });

  if (!planExistente) {
    throw new AppError('Plan no encontrado.', 404);
  }

  if (idObraSocialParam !== undefined && planExistente.idObraSocial !== idObraSocialParam) {
    throw new AppError('El plan especificado no pertenece a la obra social indicada.', 400);
  }

  const duplicadoEnMismaObraSocial = await prisma.plan.findFirst({
    where: {
      idObraSocial: planExistente.idObraSocial,
      nombre: {
        equals: datos.nombre,
        mode: 'insensitive',
      },
      idPlan: {
        not: idPlan,
      },
    },
  });

  if (duplicadoEnMismaObraSocial) {
    throw new AppError('Ya existe un plan con ese nombre.', 409, {
      nombre: 'Ya existe un plan con ese nombre.',
    });
  }

  const datosAnteriores = {
    idObraSocial: planExistente.idObraSocial,
    nombre: planExistente.nombre,
    descripcion: planExistente.descripcion,
    estado: planExistente.estado,
  };

  const actualizado = await prisma.$transaction(async (tx) => {
    const plan = await tx.plan.update({
      where: { idPlan },
      data: {
        nombre: datos.nombre,
        ...(datos.descripcion !== undefined ? { descripcion: datos.descripcion } : {}),
      },
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'MODIFICACION_PLAN_OBRA_SOCIAL',
        tablaAfectada: 'plan',
        idRegistroAfectado: idPlan,
        datosAnteriores: JSON.stringify(datosAnteriores),
        datosNuevos: JSON.stringify({
          idObraSocial: plan.idObraSocial,
          nombre: plan.nombre,
          descripcion: plan.descripcion,
          estado: plan.estado,
        }),
        ip,
        descripcion: `Modificación de plan ${datosAnteriores.nombre} a ${plan.nombre}.`,
      },
    });

    return plan;
  });

  return {
    mensaje: 'Plan actualizado correctamente.',
    plan: actualizado,
  };
}

/**
 * HU20 - Escenario 5: Baja lógica de un plan de obra social.
 * Pasa a INACTIVO y deja de aparecer en selectores sin afectar pacientes ni registros históricos.
 */
export async function darDeBajaPlanObraSocial(
  idPlan: number,
  idAdministrativo: number,
  ip?: string,
  idObraSocialParam?: number
) {
  const planExistente = await prisma.plan.findUnique({
    where: { idPlan },
  });

  if (!planExistente) {
    throw new AppError('Plan no encontrado.', 404);
  }

  if (idObraSocialParam !== undefined && planExistente.idObraSocial !== idObraSocialParam) {
    throw new AppError('El plan especificado no pertenece a la obra social indicada.', 400);
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const plan = await tx.plan.update({
      where: { idPlan },
      data: {
        estado: 'INACTIVO',
      },
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'BAJA_LOGICA_PLAN_OBRA_SOCIAL',
        tablaAfectada: 'plan',
        idRegistroAfectado: idPlan,
        datosAnteriores: JSON.stringify({
          nombre: planExistente.nombre,
          estado: planExistente.estado,
        }),
        datosNuevos: JSON.stringify({
          nombre: plan.nombre,
          estado: 'INACTIVO',
        }),
        ip,
        descripcion: `Baja lógica de plan ${planExistente.nombre}.`,
      },
    });

    return plan;
  });

  return {
    mensaje: 'El plan ha sido dado de baja correctamente.',
    plan: actualizado,
  };
}
