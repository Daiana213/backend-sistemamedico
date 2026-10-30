import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import {
  ObraSocialInput,
  PlanInput,
  ValidarElegibilidadInput,
  SimularCoberturaTurnoInput,
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
export async function obtenerObrasSocialesAtendidasPorProfesional(idProfesional: number) {
  const asignadas = await prisma.profesionalObraSocial.findMany({
    where: {
      idProfesional,
      estado: 'ACTIVO',
      obraSocial: { estado: 'ACTIVO' },
    },
    include: {
      obraSocial: {
        select: {
          idObraSocial: true,
          nombre: true,
          tipo: true,
          codigoRnos: true,
        },
      },
    },
    orderBy: {
      obraSocial: { nombre: 'asc' },
    },
  });

  if (asignadas.length > 0) {
    return asignadas.map((a) => a.obraSocial);
  }

  const todasActivas = await prisma.obraSocial.findMany({
    where: { estado: 'ACTIVO' },
    select: {
      idObraSocial: true,
      nombre: true,
      tipo: true,
      codigoRnos: true,
    },
    orderBy: { idObraSocial: 'asc' },
  });

  if (todasActivas.length <= 1) {
    return todasActivas;
  }

  const indiceExcluido = idProfesional % todasActivas.length;
  return todasActivas.filter((_, idx) => idx !== indiceExcluido);
}

export function construirRequisitosConsultaSimulados(params: {
  obraSocial: {
    idObraSocial: number;
    nombre: string;
    tipo: string;
    codigoRnos?: string | null;
  } | null;
  plan: {
    idPlan: number;
    nombre: string;
    requiereCopago: boolean;
    montoCopago: number | null;
    requiereAutorizacionPrevia: boolean;
  } | null;
  atiendeProfesional: boolean;
  nombreProfesional?: string;
  credencialVencida?: boolean;
  fechaVencimiento?: string | null;
}) {
  const { obraSocial, plan, atiendeProfesional, nombreProfesional, credencialVencida, fechaVencimiento } = params;
  const etiquetaMedico = nombreProfesional ? `el profesional ${nombreProfesional}` : 'el profesional seleccionado';

  if (!obraSocial) {
    const requisitosSinObraSocial = [
      'Documento Nacional de Identidad (DNI) físico o digital en app Mi Argentina',
      'Medio de pago habilitado para abonar la consulta particular en recepción (efectivo, tarjeta de débito/crédito o transferencia)',
      'Estudios médicos previos vinculados al motivo de consulta (si los tuviera)',
    ];
    return {
      atiendeObraSocial: false,
      modalidadAtencion: 'PARTICULAR_SIN_CONVENIO' as const,
      requiereAviso: true,
      aviso: `El paciente no registra una obra social activa asignada. La consulta con ${etiquetaMedico} se realizará bajo modalidad Particular.`,
      requisitosConsulta: requisitosSinObraSocial,
      detalleRequisitos: {
        dni: 'DNI físico o digital en Mi Argentina.',
        tarjetaAfiliado: 'No aplica (atención particular sin cobertura).',
        ordenMedica: 'No requiere orden médica de obra social.',
        copago: {
          requiere: true,
          monto: null,
          descripcion: 'Abona el arancel de consulta particular en recepción.',
        },
        tokenDigital: {
          requiere: false,
          descripcion: 'No requiere token digital.',
        },
      },
    };
  }

  if (!atiendeProfesional) {
    const requisitosParticular = [
      'Documento Nacional de Identidad (DNI) físico o digital en app Mi Argentina',
      `Medio de pago para abonar la consulta particular en recepción (ya que ${etiquetaMedico} no atiende por ${obraSocial.nombre})`,
      `Datos de facturación si desea solicitar factura oficial para gestionar reintegro ante ${obraSocial.nombre}`,
      'Estudios médicos o análisis previos relacionados con el motivo de la consulta (si los tuviera)',
    ];

    return {
      atiendeObraSocial: false,
      modalidadAtencion: 'PARTICULAR_SIN_CONVENIO' as const,
      requiereAviso: true,
      aviso: `Atención: ${etiquetaMedico} no atiende por su obra social (${obraSocial.nombre}). Si continúa con el turno, deberá abonar la consulta de forma particular o gestionar reintegro por fuera del sanatorio.`,
      requisitosConsulta: requisitosParticular,
      detalleRequisitos: {
        dni: 'DNI físico o digital vigente para acreditar identidad.',
        tarjetaAfiliado: `Su credencial de ${obraSocial.nombre} no posee convenio directo con este profesional.`,
        ordenMedica: 'No requiere orden autorizada (modalidad particular).',
        copago: {
          requiere: true,
          monto: null,
          descripcion: 'Abona consulta particular en caja al anunciarse en recepción.',
        },
        tokenDigital: {
          requiere: false,
          descripcion: 'No requiere token digital.',
        },
      },
    };
  }

  const requisitos: string[] = [
    'Documento Nacional de Identidad (DNI) vigente para acreditar identidad en recepción',
  ];

  let tarjetaAfiliadoDesc = '';
  let tokenDigitalDesc = 'No requiere token digital.';
  let requiereToken = false;

  switch (obraSocial.tipo) {
    case 'MEDICINA_PREPAGA':
      tarjetaAfiliadoDesc = `Credencial digital activa o tarjeta física de afiliado de ${obraSocial.nombre}${plan ? ` (Plan ${plan.nombre})` : ''}`;
      requisitos.push(tarjetaAfiliadoDesc);
      requiereToken = true;
      tokenDigitalDesc = `Token digital dinámico de seguridad (código de 6 dígitos generado desde la app móvil de ${obraSocial.nombre} al anunciarse en recepción)`;
      requisitos.push(tokenDigitalDesc);
      break;
    case 'PAMI_INSSJP':
      tarjetaAfiliadoDesc = 'Credencial de afiliación PAMI vigente (plástica, digital en app PAMI o constancia de afiliación con código QR)';
      requisitos.push(tarjetaAfiliadoDesc);
      requisitos.push('Orden Médica Electrónica (OME) emitida por el médico de cabecera');
      break;
    case 'OBRA_SOCIAL_PROVINCIAL':
      tarjetaAfiliadoDesc = `Tarjeta o carnet de afiliado de ${obraSocial.nombre} junto con el último recibo de haberes o comprobante de pago vigente`;
      requisitos.push(tarjetaAfiliadoDesc);
      requisitos.push(`Bono de consulta médica provincial de ${obraSocial.nombre}`);
      break;
    case 'OBRA_SOCIAL_SINDICAL':
    default:
      tarjetaAfiliadoDesc = `Tarjeta o carnet de afiliado vigente de ${obraSocial.nombre} (titular o adherente con barra familiar)`;
      requisitos.push(tarjetaAfiliadoDesc);
      requisitos.push('Último recibo de sueldo o comprobante de pago de monotributo/aporte al día');
      break;
  }

  const requiereAutorizacion = plan?.requiereAutorizacionPrevia ?? false;
  let ordenMedicaDesc = 'No requiere orden física preautorizada (validación en recepción).';

  if (requiereAutorizacion) {
    ordenMedicaDesc = `Orden médica o bono de consulta previamente autorizado por ${obraSocial.nombre} (traer código de autorización o formulario impreso)`;
    requisitos.push(ordenMedicaDesc);
  } else if (obraSocial.tipo !== 'PAMI_INSSJP') {
    requisitos.push(`Bono u orden de consulta estándar de ${obraSocial.nombre} (se valida en mesa de entradas)`);
  }

  const requiereCopago = plan?.requiereCopago ?? false;
  const montoCopago = plan?.montoCopago !== undefined && plan?.montoCopago !== null ? Number(plan.montoCopago) : null;
  let copagoDesc = 'Exento de copago arancelario según su plan.';

  if (requiereCopago) {
    const textoMonto = montoCopago !== null ? ` por $${montoCopago.toFixed(2)}` : '';
    copagoDesc = `Abonar en recepción el coseguro / copago correspondiente al plan ${plan?.nombre || ''}${textoMonto}`;
    requisitos.push(copagoDesc);
  }

  requisitos.push('Estudios médicos o análisis previos vinculados al motivo de la consulta (si los tuviera)');

  let aviso = `Cobertura confirmada: ${etiquetaMedico} atiende por ${obraSocial.nombre}${plan ? ` (${plan.nombre})` : ''}. Recuerde presentar los requisitos indicados al anunciarse en recepción.`;
  let requiereAviso = false;

  if (credencialVencida) {
    requiereAviso = true;
    aviso = `Atención: Su credencial de ${obraSocial.nombre} figura vencida (${fechaVencimiento}). Aunque ${etiquetaMedico} atiende por su obra social, deberá presentar constancia de afiliación renovada o abonar la consulta como particular.`;
    requisitos.unshift('Constancia de afiliación actualizada o credencial renovada (su credencial registrada figura vencida)');
  }

  return {
    atiendeObraSocial: true,
    modalidadAtencion: 'CON_COBERTURA' as const,
    requiereAviso,
    aviso,
    requisitosConsulta: requisitos,
    detalleRequisitos: {
      dni: 'DNI físico o digital vigente para acreditar identidad.',
      tarjetaAfiliado: tarjetaAfiliadoDesc,
      ordenMedica: ordenMedicaDesc,
      copago: {
        requiere: requiereCopago,
        monto: montoCopago,
        descripcion: copagoDesc,
      },
      tokenDigital: {
        requiere: requiereToken,
        descripcion: tokenDigitalDesc,
      },
    },
  };
}

export async function simularCoberturaYRequisitosTurno(
  datos: SimularCoberturaTurnoInput,
  idUsuarioAutenticado?: number,
  rolActivo?: string
) {
  const profesional = await prisma.profesional.findUnique({
    where: { idProfesional: datos.idProfesional },
    include: {
      usuario: {
        select: {
          nombre: true,
          apellido: true,
        },
      },
      especialidades: {
        where: { estado: 'ACTIVO' },
        include: { especialidad: true },
      },
    },
  });

  if (!profesional) {
    throw new AppError('Profesional no encontrado.', 404);
  }

  const nombreProfesional = `Dr./Dra. ${profesional.usuario.nombre} ${profesional.usuario.apellido}`;
  const obrasSocialesProfesional = await obtenerObrasSocialesAtendidasPorProfesional(profesional.idProfesional);

  let paciente: any = null;
  if (datos.idPaciente) {
    paciente = await prisma.paciente.findUnique({
      where: { idPaciente: datos.idPaciente },
      include: {
        plan: {
          include: { obraSocial: true },
        },
      },
    });
  } else if (idUsuarioAutenticado && rolActivo === 'PACIENTE') {
    paciente = await prisma.paciente.findUnique({
      where: { idUsuario: idUsuarioAutenticado },
      include: {
        plan: {
          include: { obraSocial: true },
        },
      },
    });
  }

  let obraSocial: any = null;
  let plan: any = null;

  if (datos.idObraSocial) {
    obraSocial = await prisma.obraSocial.findUnique({
      where: { idObraSocial: datos.idObraSocial },
    });
    if (datos.idPlan) {
      plan = await prisma.plan.findFirst({
        where: { idPlan: datos.idPlan, idObraSocial: datos.idObraSocial },
      });
    }
  } else if (paciente?.plan) {
    plan = paciente.plan;
    obraSocial = paciente.plan.obraSocial;
  }

  const atiendeProfesional = obraSocial
    ? obrasSocialesProfesional.some((os) => os.idObraSocial === obraSocial.idObraSocial)
    : false;

  let credencialVencida = false;
  let fechaVencimientoStr: string | null = null;
  if (paciente?.vencimientoCredencial) {
    fechaVencimientoStr = new Date(paciente.vencimientoCredencial).toISOString().split('T')[0];
    if (new Date(paciente.vencimientoCredencial) < new Date()) {
      credencialVencida = true;
    }
  }

  const simulacion = construirRequisitosConsultaSimulados({
    obraSocial: obraSocial
      ? {
          idObraSocial: obraSocial.idObraSocial,
          nombre: obraSocial.nombre,
          tipo: obraSocial.tipo,
          codigoRnos: obraSocial.codigoRnos,
        }
      : null,
    plan: plan
      ? {
          idPlan: plan.idPlan,
          nombre: plan.nombre,
          requiereCopago: plan.requiereCopago,
          montoCopago: plan.montoCopago !== null ? Number(plan.montoCopago) : null,
          requiereAutorizacionPrevia: plan.requiereAutorizacionPrevia,
        }
      : null,
    atiendeProfesional,
    nombreProfesional,
    credencialVencida,
    fechaVencimiento: fechaVencimientoStr,
  });

  return {
    profesional: {
      idProfesional: profesional.idProfesional,
      nombreCompleto: nombreProfesional,
      matricula: profesional.matricula,
      especialidades: profesional.especialidades.map((e) => e.especialidad.nombre),
      obrasSocialesAtendidas: obrasSocialesProfesional,
    },
    coberturaPaciente: {
      obraSocial: obraSocial
        ? {
            idObraSocial: obraSocial.idObraSocial,
            nombre: obraSocial.nombre,
            tipo: obraSocial.tipo,
            codigoRnos: obraSocial.codigoRnos,
          }
        : null,
      plan: plan
        ? {
            idPlan: plan.idPlan,
            nombre: plan.nombre,
            requiereCopago: plan.requiereCopago,
            montoCopago: plan.montoCopago !== null ? Number(plan.montoCopago) : null,
            requiereAutorizacionPrevia: plan.requiereAutorizacionPrevia,
          }
        : null,
      numeroAfiliado: paciente?.numeroAfiliado || null,
      subfijoAdherente: paciente?.subfijoAdherente || null,
      vencimientoCredencial: fechaVencimientoStr,
      credencialVencida,
    },
    ...simulacion,
  };
}

export async function validarElegibilidadAfiliado(datos: ValidarElegibilidadInput) {
  let paciente: any = null;
  if (datos.idPaciente) {
    paciente = await prisma.paciente.findUnique({
      where: { idPaciente: datos.idPaciente },
      include: {
        usuario: true,
        plan: { include: { obraSocial: true } },
      },
    });
  }

  const idObraSocialFinal = datos.idObraSocial ?? paciente?.plan?.idObraSocial;
  if (!idObraSocialFinal) {
    throw new AppError('Debe indicar una obra social válida o un paciente con cobertura asignada.', 400);
  }

  const obraSocial = await prisma.obraSocial.findUnique({
    where: { idObraSocial: idObraSocialFinal },
  });

  if (!obraSocial) {
    throw new AppError('Obra social no encontrada.', 404);
  }

  let atiendeProfesional = true;
  let nombreProfesional: string | undefined = undefined;
  let obrasSocialesProfesional: any[] = [];

  if (datos.idProfesional) {
    const prof = await prisma.profesional.findUnique({
      where: { idProfesional: datos.idProfesional },
      include: { usuario: true },
    });
    if (prof) {
      nombreProfesional = `Dr./Dra. ${prof.usuario.nombre} ${prof.usuario.apellido}`;
      obrasSocialesProfesional = await obtenerObrasSocialesAtendidasPorProfesional(prof.idProfesional);
      atiendeProfesional = obrasSocialesProfesional.some(
        (os) => os.idObraSocial === obraSocial.idObraSocial
      );
    }
  }

  const idPlanFinal = datos.idPlan ?? paciente?.idPlan;
  let plan: any = null;
  if (idPlanFinal) {
    plan = await prisma.plan.findFirst({
      where: {
        idPlan: idPlanFinal,
        idObraSocial: obraSocial.idObraSocial,
      },
    });
  }

  let credencialVencida = false;
  let fechaVencimientoStr: string | null = null;
  if (paciente?.vencimientoCredencial) {
    fechaVencimientoStr = new Date(paciente.vencimientoCredencial).toISOString().split('T')[0];
    if (new Date(paciente.vencimientoCredencial) < new Date()) {
      credencialVencida = true;
    }
  }

  const simulacionRequisitos = construirRequisitosConsultaSimulados({
    obraSocial: {
      idObraSocial: obraSocial.idObraSocial,
      nombre: obraSocial.nombre,
      tipo: obraSocial.tipo,
      codigoRnos: obraSocial.codigoRnos,
    },
    plan: plan
      ? {
          idPlan: plan.idPlan,
          nombre: plan.nombre,
          requiereCopago: plan.requiereCopago,
          montoCopago: plan.montoCopago !== null ? Number(plan.montoCopago) : null,
          requiereAutorizacionPrevia: plan.requiereAutorizacionPrevia,
        }
      : null,
    atiendeProfesional,
    nombreProfesional,
    credencialVencida,
    fechaVencimiento: fechaVencimientoStr,
  });

  if (obraSocial.estado !== 'ACTIVO') {
    return {
      elegible: false,
      atiendeProfesional: false,
      estadoCobertura: 'INACTIVO_O_SUSPENDIDO',
      mensaje: `La obra social "${obraSocial.nombre}" se encuentra inactiva o con convenio suspendido en el sanatorio.`,
      aviso: simulacionRequisitos.aviso,
      requisitosConsulta: simulacionRequisitos.requisitosConsulta,
      detalleRequisitos: simulacionRequisitos.detalleRequisitos,
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

  if (plan && plan.estado !== 'ACTIVO') {
    return {
      elegible: false,
      atiendeProfesional,
      estadoCobertura: 'INACTIVO_O_SUSPENDIDO',
      mensaje: `El plan "${plan.nombre}" se encuentra inactivo para nuevos servicios.`,
      aviso: simulacionRequisitos.aviso,
      requisitosConsulta: simulacionRequisitos.requisitosConsulta,
      detalleRequisitos: simulacionRequisitos.detalleRequisitos,
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

  if (credencialVencida) {
    return {
      elegible: false,
      atiendeProfesional,
      estadoCobertura: 'VENCIDO',
      mensaje: `La credencial médica del paciente venció el ${fechaVencimientoStr}. Se requiere actualización de constancia o carnet digital.`,
      aviso: simulacionRequisitos.aviso,
      requisitosConsulta: simulacionRequisitos.requisitosConsulta,
      detalleRequisitos: simulacionRequisitos.detalleRequisitos,
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
  let mensaje = simulacionRequisitos.aviso;

  if (!atiendeProfesional) {
    estadoCobertura = 'PROFESIONAL_SIN_CONVENIO';
  } else if (requiereCopago && requiereAutorizacion) {
    estadoCobertura = 'REQUIERE_COPAGO_Y_AUTORIZACION';
  } else if (requiereCopago) {
    estadoCobertura = 'REQUIERE_COPAGO';
  } else if (requiereAutorizacion) {
    estadoCobertura = 'REQUIERE_AUTORIZACION';
  }

  return {
    elegible: atiendeProfesional,
    atiendeProfesional,
    modalidadAtencion: simulacionRequisitos.modalidadAtencion,
    requiereAviso: simulacionRequisitos.requiereAviso,
    estadoCobertura,
    mensaje,
    aviso: simulacionRequisitos.aviso,
    requisitosConsulta: simulacionRequisitos.requisitosConsulta,
    detalleRequisitos: simulacionRequisitos.detalleRequisitos,
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
      motivo: requiereAutorizacion ? 'Estudio o práctica ambulatoria bajo plan con auditoría previa' : null,
    },
  };
}
