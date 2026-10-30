import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import {
  ObraSocialInput,
  PlanInput,
  ValidarElegibilidadInput,
} from '../validations/obraSocialValidation';

export async function listarObrasSocialesActivas(incluirInactivas = false) {
  const whereClause = incluirInactivas ? {} : { estado: 'ACTIVO' as const };

  return prisma.obraSocial.findMany({
    where: whereClause,
    orderBy: { nombre: 'asc' },
    select: {
      idObraSocial: true,
      nombre: true,
      descripcion: true,
      codigoRnos: true,
      cuit: true,
      razonSocial: true,
      tipo: true,
      estado: true,
      planes: {
        where: incluirInactivas ? {} : { estado: 'ACTIVO' },
        orderBy: { nombre: 'asc' },
        select: {
          idPlan: true,
          idObraSocial: true,
          nombre: true,
          descripcion: true,
          requiereCopago: true,
          montoCopago: true,
          requiereAutorizacionPrevia: true,
          estado: true,
        },
      },
    },
  });
}

export async function obtenerObraSocialPorId(idObraSocial: number, incluirInactivos = false) {
  const obraSocial = await prisma.obraSocial.findUnique({
    where: { idObraSocial },
    select: {
      idObraSocial: true,
      nombre: true,
      descripcion: true,
      codigoRnos: true,
      cuit: true,
      razonSocial: true,
      tipo: true,
      estado: true,
      planes: {
        where: incluirInactivos ? {} : { estado: 'ACTIVO' },
        orderBy: { nombre: 'asc' },
        select: {
          idPlan: true,
          idObraSocial: true,
          nombre: true,
          descripcion: true,
          requiereCopago: true,
          montoCopago: true,
          requiereAutorizacionPrevia: true,
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
      requiereCopago: true,
      montoCopago: true,
      requiereAutorizacionPrevia: true,
      estado: true,
    },
  });
}

export async function crearObraSocial(
  datos: ObraSocialInput,
  idAdministrativo: number,
  ip?: string
) {
  const nombreLimpio = datos.nombre.trim();

  const existente = await prisma.obraSocial.findFirst({
    where: {
      nombre: {
        equals: nombreLimpio,
        mode: 'insensitive',
      },
    },
  });

  if (existente) {
    throw new AppError('Ya existe una obra social con ese nombre.', 409, {
      nombre: 'Ya existe una obra social con ese nombre.',
    });
  }

  if (datos.cuit) {
    const cuitExistente = await prisma.obraSocial.findFirst({
      where: { cuit: datos.cuit.trim() },
    });
    if (cuitExistente) {
      throw new AppError('Ya existe una obra social registrada con ese CUIT fiscal.', 409, {
        cuit: 'Ya existe una obra social registrada con ese CUIT fiscal.',
      });
    }
  }

  const nuevaObraSocial = await prisma.$transaction(async (tx) => {
    const creada = await tx.obraSocial.create({
      data: {
        nombre: nombreLimpio,
        descripcion: datos.descripcion?.trim() ?? null,
        codigoRnos: datos.codigoRnos?.trim() ?? null,
        cuit: datos.cuit?.trim() ?? null,
        razonSocial: datos.razonSocial?.trim() ?? null,
        tipo: datos.tipo ?? 'OBRA_SOCIAL_SINDICAL',
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
        descripcion: `Alta de obra social ${creada.nombre} (Tipo: ${creada.tipo}).`,
      },
    });

    return creada;
  });

  return {
    mensaje: 'Obra social agregada correctamente.',
    obraSocial: nuevaObraSocial,
  };
}

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

  const nombreLimpio = datos.nombre.trim();

  const duplicada = await prisma.obraSocial.findFirst({
    where: {
      nombre: {
        equals: nombreLimpio,
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

  if (datos.cuit) {
    const cuitDuplicado = await prisma.obraSocial.findFirst({
      where: {
        cuit: datos.cuit.trim(),
        idObraSocial: { not: idObraSocial },
      },
    });
    if (cuitDuplicado) {
      throw new AppError('Ya existe otra obra social registrada con ese CUIT.', 409, {
        cuit: 'Ya existe otra obra social registrada con ese CUIT.',
      });
    }
  }

  const datosAnteriores = {
    nombre: obraSocial.nombre,
    descripcion: obraSocial.descripcion,
    codigoRnos: obraSocial.codigoRnos,
    cuit: obraSocial.cuit,
    razonSocial: obraSocial.razonSocial,
    tipo: obraSocial.tipo,
    estado: obraSocial.estado,
  };

  const datosActualizacion: any = {
    nombre: nombreLimpio,
  };
  if (datos.descripcion !== undefined) datosActualizacion.descripcion = datos.descripcion?.trim() ?? null;
  if (datos.codigoRnos !== undefined) datosActualizacion.codigoRnos = datos.codigoRnos?.trim() ?? null;
  if (datos.cuit !== undefined) datosActualizacion.cuit = datos.cuit?.trim() ?? null;
  if (datos.razonSocial !== undefined) datosActualizacion.razonSocial = datos.razonSocial?.trim() ?? null;
  if (datos.tipo !== undefined) datosActualizacion.tipo = datos.tipo;

  const actualizada = await prisma.$transaction(async (tx) => {
    const os = await tx.obraSocial.update({
      where: { idObraSocial },
      data: datosActualizacion,
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'MODIFICACION_OBRA_SOCIAL',
        tablaAfectada: 'obra_social',
        idRegistroAfectado: idObraSocial,
        datosAnteriores: JSON.stringify(datosAnteriores),
        datosNuevos: JSON.stringify(os),
        ip,
        descripcion: `Modificacion de obra social ${datosAnteriores.nombre} a ${os.nombre}.`,
      },
    });

    return os;
  });

  return {
    mensaje: 'Obra social actualizada correctamente.',
    obraSocial: actualizada,
  };
}

export async function darDeBajaObraSocial(
  idObraSocial: number,
  idAdministrativo: number,
  ip?: string
) {
  const obraSocial = await prisma.obraSocial.findUnique({
    where: { idObraSocial },
    include: {
      planes: {
        select: { idPlan: true },
      },
    },
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

    // Baja en cascada logica a sus planes
    await tx.plan.updateMany({
      where: { idObraSocial },
      data: { estado: 'INACTIVO' },
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
        descripcion: `Baja logica de obra social ${obraSocial.nombre} y sus planes asociados.`,
      },
    });

    return os;
  });

  return {
    mensaje: 'La obra social ha sido dada de baja correctamente.',
    obraSocial: actualizada,
  };
}

export async function reactivarObraSocial(
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

  const reactivada = await prisma.$transaction(async (tx) => {
    const os = await tx.obraSocial.update({
      where: { idObraSocial },
      data: {
        estado: 'ACTIVO',
      },
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'REACTIVACION_OBRA_SOCIAL',
        tablaAfectada: 'obra_social',
        idRegistroAfectado: idObraSocial,
        datosAnteriores: JSON.stringify({ estado: obraSocial.estado }),
        datosNuevos: JSON.stringify({ estado: 'ACTIVO' }),
        ip,
        descripcion: `Reactivacion de obra social ${os.nombre}.`,
      },
    });

    return os;
  });

  return {
    mensaje: 'La obra social ha sido reactivada correctamente.',
    obraSocial: reactivada,
  };
}

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

  const nombreLimpio = datos.nombre.trim();

  const planDuplicado = await prisma.plan.findFirst({
    where: {
      idObraSocial,
      nombre: {
        equals: nombreLimpio,
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
        nombre: nombreLimpio,
        descripcion: datos.descripcion?.trim() ?? null,
        requiereCopago: datos.requiereCopago ?? false,
        montoCopago: datos.montoCopago !== undefined && datos.montoCopago !== null ? datos.montoCopago : null,
        requiereAutorizacionPrevia: datos.requiereAutorizacionPrevia ?? false,
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

  const nombreLimpio = datos.nombre.trim();

  const duplicadoEnMismaObraSocial = await prisma.plan.findFirst({
    where: {
      idObraSocial: planExistente.idObraSocial,
      nombre: {
        equals: nombreLimpio,
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
    requiereCopago: planExistente.requiereCopago,
    montoCopago: planExistente.montoCopago,
    requiereAutorizacionPrevia: planExistente.requiereAutorizacionPrevia,
    estado: planExistente.estado,
  };

  const datosActualizacion: any = {
    nombre: nombreLimpio,
  };
  if (datos.descripcion !== undefined) datosActualizacion.descripcion = datos.descripcion?.trim() ?? null;
  if (datos.requiereCopago !== undefined) datosActualizacion.requiereCopago = datos.requiereCopago;
  if (datos.montoCopago !== undefined) {
    datosActualizacion.montoCopago = datos.montoCopago !== null ? datos.montoCopago : null;
  }
  if (datos.requiereAutorizacionPrevia !== undefined) {
    datosActualizacion.requiereAutorizacionPrevia = datos.requiereAutorizacionPrevia;
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const plan = await tx.plan.update({
      where: { idPlan },
      data: datosActualizacion,
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'MODIFICACION_PLAN_OBRA_SOCIAL',
        tablaAfectada: 'plan',
        idRegistroAfectado: idPlan,
        datosAnteriores: JSON.stringify(datosAnteriores),
        datosNuevos: JSON.stringify(plan),
        ip,
        descripcion: `Modificacion de plan ${datosAnteriores.nombre} a ${plan.nombre}.`,
      },
    });

    return plan;
  });

  return {
    mensaje: 'Plan actualizado correctamente.',
    plan: actualizado,
  };
}

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
        descripcion: `Baja logica de plan ${planExistente.nombre}.`,
      },
    });

    return plan;
  });

  return {
    mensaje: 'El plan ha sido dado de baja correctamente.',
    plan: actualizado,
  };
}

export async function reactivarPlanObraSocial(
  idPlan: number,
  idAdministrativo: number,
  ip?: string,
  idObraSocialParam?: number
) {
  const planExistente = await prisma.plan.findUnique({
    where: { idPlan },
    include: { obraSocial: true },
  });

  if (!planExistente) {
    throw new AppError('Plan no encontrado.', 404);
  }

  if (idObraSocialParam !== undefined && planExistente.idObraSocial !== idObraSocialParam) {
    throw new AppError('El plan especificado no pertenece a la obra social indicada.', 400);
  }

  if (planExistente.obraSocial.estado !== 'ACTIVO') {
    throw new AppError(
      'No se puede reactivar un plan cuya obra social se encuentra inactiva. Reactive primero la obra social.',
      400
    );
  }

  const reactivado = await prisma.$transaction(async (tx) => {
    const plan = await tx.plan.update({
      where: { idPlan },
      data: {
        estado: 'ACTIVO',
      },
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'REACTIVACION_PLAN_OBRA_SOCIAL',
        tablaAfectada: 'plan',
        idRegistroAfectado: idPlan,
        datosAnteriores: JSON.stringify({ estado: planExistente.estado }),
        datosNuevos: JSON.stringify({ estado: 'ACTIVO' }),
        ip,
        descripcion: `Reactivacion de plan ${plan.nombre}.`,
      },
    });

    return plan;
  });

  return {
    mensaje: 'El plan ha sido reactivado correctamente.',
    plan: reactivado,
  };
}

/**
 * Validacion de elegibilidad y cobertura de afiliados para admision y recepcion en Argentina.
 * Verifica estado de la obra social, plan, vigencia de credencial y reglas de copago o token digital.
 */
export async function validarElegibilidadAfiliado(datos: ValidarElegibilidadInput) {
  const obraSocial = await prisma.obraSocial.findUnique({
    where: { idObraSocial: datos.idObraSocial },
  });

  if (!obraSocial) {
    throw new AppError('Obra social no encontrada.', 404);
  }

  if (obraSocial.estado !== 'ACTIVO') {
    return {
      elegible: false,
      estadoCobertura: 'INACTIVO_O_SUSPENDIDO',
      mensaje: `La obra social "${obraSocial.nombre}" se encuentra inactiva o con convenio suspendido en el sanatorio.`,
      obraSocial: {
        idObraSocial: obraSocial.idObraSocial,
        nombre: obraSocial.nombre,
        tipo: obraSocial.tipo,
        codigoRnos: obraSocial.codigoRnos,
      },
      plan: null,
      copago: { requiere: false, monto: null },
      autorizacion: { requiere: false, motivo: null },
    };
  }

  let plan: any = null;
  if (datos.idPlan) {
    plan = await prisma.plan.findFirst({
      where: {
        idPlan: datos.idPlan,
        idObraSocial: datos.idObraSocial,
      },
    });

    if (!plan) {
      throw new AppError('El plan especificado no pertenece a la obra social.', 400);
    }

    if (plan.estado !== 'ACTIVO') {
      return {
        elegible: false,
        estadoCobertura: 'INACTIVO_O_SUSPENDIDO',
        mensaje: `El plan "${plan.nombre}" se encuentra inactivo para nuevos servicios.`,
        obraSocial: {
          idObraSocial: obraSocial.idObraSocial,
          nombre: obraSocial.nombre,
          tipo: obraSocial.tipo,
        },
        plan: {
          idPlan: plan.idPlan,
          nombre: plan.nombre,
        },
        copago: { requiere: false, monto: null },
        autorizacion: { requiere: false, motivo: null },
      };
    }
  }

  let paciente: any = null;
  if (datos.idPaciente) {
    paciente = await prisma.paciente.findUnique({
      where: { idPaciente: datos.idPaciente },
      include: { usuario: true },
    });

    if (paciente?.vencimientoCredencial) {
      const hoy = new Date();
      if (new Date(paciente.vencimientoCredencial) < hoy) {
        return {
          elegible: false,
          estadoCobertura: 'VENCIDO',
          mensaje: `La credencial médica del paciente vencio el ${paciente.vencimientoCredencial.toISOString().split('T')[0]}. Se requiere actualizacion de constancia o carnet digital.`,
          obraSocial: {
            idObraSocial: obraSocial.idObraSocial,
            nombre: obraSocial.nombre,
            tipo: obraSocial.tipo,
          },
          plan: plan ? { idPlan: plan.idPlan, nombre: plan.nombre } : null,
          copago: { requiere: false, monto: null },
          autorizacion: { requiere: false, motivo: null },
        };
      }
    }
  }

  // Validacion de Token Digital para Medicina Prepaga
  const esPrepaga = obraSocial.tipo === 'MEDICINA_PREPAGA';
  let tokenValidado = false;
  if (esPrepaga && datos.tokenDigital) {
    const tokenLimpio = datos.tokenDigital.trim();
    tokenValidado = /^[0-9A-Za-z]{4,8}$/.test(tokenLimpio);
  }

  const requiereCopago = plan?.requiereCopago ?? false;
  const montoCopago = plan?.montoCopago ? Number(plan.montoCopago) : null;
  const requiereAutorizacion = plan?.requiereAutorizacionPrevia ?? false;

  let estadoCobertura = 'HABILITADO';
  let mensaje = 'Afiliado verificado y habilitado para atencion medica.';

  if (requiereCopago && requiereAutorizacion) {
    estadoCobertura = 'REQUIERE_COPAGO_Y_AUTORIZACION';
    mensaje = `Cobertura activa con copago/bono ($${montoCopago ?? '0'}) y orden autorizada previa requerida.`;
  } else if (requiereCopago) {
    estadoCobertura = 'REQUIERE_COPAGO';
    mensaje = `Cobertura activa sujeta a coseguro/bono de consulta ($${montoCopago ?? '0'}).`;
  } else if (requiereAutorizacion) {
    estadoCobertura = 'REQUIERE_AUTORIZACION';
    mensaje = 'Cobertura activa. Requiere registrar numero de autorizacion previo para la practica.';
  }

  return {
    elegible: true,
    estadoCobertura,
    mensaje,
    obraSocial: {
      idObraSocial: obraSocial.idObraSocial,
      nombre: obraSocial.nombre,
      tipo: obraSocial.tipo,
      codigoRnos: obraSocial.codigoRnos,
      cuit: obraSocial.cuit,
      razonSocial: obraSocial.razonSocial,
    },
    plan: plan
      ? {
          idPlan: plan.idPlan,
          nombre: plan.nombre,
          requiereCopago: plan.requiereCopago,
          montoCopago,
          requiereAutorizacionPrevia: plan.requiereAutorizacionPrevia,
        }
      : null,
    afiliado: {
      numeroAfiliado: datos.numeroAfiliado || paciente?.numeroAfiliado || null,
      subfijoAdherente: datos.subfijoAdherente || paciente?.subfijoAdherente || null,
      tokenDigitalValidado: tokenValidado,
    },
    copago: {
      requiere: requiereCopago,
      monto: montoCopago,
    },
    autorizacion: {
      requiere: requiereAutorizacion,
      motivo: requiereAutorizacion ? 'Estudio o practica ambulatoria bajo plan cerrado' : null,
    },
  };
}
