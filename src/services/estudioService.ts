import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { calcularEdad } from '../utils/edad';
import {
  EstudioMedicoInput,
  EstudioAdminCrearInput,
  EstudioActualizarInput,
} from '../validations/estudioValidation';
import { buscarEstudioEnPacs } from './pacsService';
import { generarPdfInformeEstudio } from '../utils/pdfInformeEstudio';

let tablaVerificada = false;

/**
 * Garantiza de forma transparente que la tabla estudio_medico exista en la base de datos
 * incluso en entornos donde aún no se haya corrido prisma migrate deploy manualmente.
 */
async function asegurarTablaEstudioMedico() {
  if (tablaVerificada) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "estudio_medico" (
        "id_estudio" SERIAL NOT NULL,
        "id_paciente" INTEGER NOT NULL,
        "id_profesional" INTEGER,
        "nombre" VARCHAR(150) NOT NULL,
        "codigo" VARCHAR(150) NOT NULL,
        "observacion" TEXT,
        "estado" "estado_activo" NOT NULL DEFAULT 'ACTIVO',
        "fecha_carga" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "fecha_actualizacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "estudio_medico_pkey" PRIMARY KEY ("id_estudio")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_estudio_medico_paciente_estado"
      ON "estudio_medico"("id_paciente", "estado");
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "estudio_medico" ADD COLUMN IF NOT EXISTS "id_profesional" INTEGER;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "profesional" ADD COLUMN IF NOT EXISTS "puede_cargar_estudios" BOOLEAN NOT NULL DEFAULT false;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "turno" ADD COLUMN IF NOT EXISTS "recordatorio_enviado" BOOLEAN NOT NULL DEFAULT false;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "turno" ADD COLUMN IF NOT EXISTS "fecha_recordatorio" TIMESTAMP(6);
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "turno" ADD COLUMN IF NOT EXISTS "presente" BOOLEAN NOT NULL DEFAULT false;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "turno" ADD COLUMN IF NOT EXISTS "fecha_llegada" TIMESTAMP(6);
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "turno" ADD COLUMN IF NOT EXISTS "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
    tablaVerificada = true;
  } catch {
    tablaVerificada = true;
  }
}

/**
 * Genera un código de estudio legible y único para estudios clínicos o análisis que no
 * provienen de un emisor DICOM / StudyInstanceUID.
 */
export function generarCodigoEstudio(): string {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EST-${anio}${mes}${dia}-${randomHex}`;
}

/**
 * Construye los metadatos de integración desacoplada con servidores PACS (Orthanc / Dcm4chee)
 * y visualizadores DICOM web zero-footprint (OHIF Viewer / DWV) a partir del código o StudyInstanceUID.
 */
export function construirMetadatosPacs(codigo: string) {
  const codigoLimpio = codigo.trim();
  // Un StudyInstanceUID estándar DICOM se compone de números separados por puntos (ej. 1.2.840.113619...)
  const esDicomUid = /^\d+(\.\d+)+$/.test(codigoLimpio);

  const ohifViewerBaseUrl = process.env.OHIF_VIEWER_URL || null;
  const orthancBaseUrl = process.env.ORTHANC_URL || null;

  return {
    tipoIdentificador: esDicomUid ? 'DICOM_STUDY_INSTANCE_UID' : 'CODIGO_ESTUDIO',
    studyInstanceUid: codigoLimpio,
    urlVisualizadorOhif: ohifViewerBaseUrl
      ? `${ohifViewerBaseUrl.replace(/\/$/, '')}/viewer?StudyInstanceUIDs=${encodeURIComponent(codigoLimpio)}`
      : null,
    urlOrthancDicomWeb: orthancBaseUrl
      ? `${orthancBaseUrl.replace(/\/$/, '')}/dicom-web/studies/${encodeURIComponent(codigoLimpio)}`
      : null,
    urlOrthancStoneViewer: orthancBaseUrl
      ? `${orthancBaseUrl.replace(/\/$/, '')}/stone-webviewer/index.html?study=${encodeURIComponent(codigoLimpio)}`
      : null,
  };
}

function mapearEstudioRespuesta(estudio: {
  idEstudio: number;
  idPaciente: number;
  idProfesional?: number | null;
  nombre: string;
  codigo: string;
  observacion: string | null;
  estado: string;
  fechaCarga: Date;
  fechaActualizacion: Date;
}) {
  return {
    idEstudio: estudio.idEstudio,
    idPaciente: estudio.idPaciente,
    idProfesional: estudio.idProfesional ?? null,
    nombre: estudio.nombre,
    codigo: estudio.codigo,
    observacion: estudio.observacion,
    estado: estudio.estado,
    fechaCarga: estudio.fechaCarga,
    fechaActualizacion: estudio.fechaActualizacion,
    integracionPacs: construirMetadatosPacs(estudio.codigo),
  };
}

async function obtenerPacientePorUsuario(idUsuario: number) {
  const paciente = await prisma.paciente.findUnique({
    where: { idUsuario },
  });

  if (!paciente) {
    throw new AppError('No se encontró el perfil de paciente asociado a su usuario.', 404);
  }

  return paciente;
}

/**
 * Verifica que el profesional autenticado tenga vínculo (al menos un turno asignado)
 * con el paciente solicitado (HU8 Escenario 3 / HU21 Escenario 3).
 */
async function verificarVinculoProfesionalPaciente(
  idUsuarioProfesional: number,
  idPaciente: number
) {
  const profesional = await prisma.profesional.findUnique({
    where: { idUsuario: idUsuarioProfesional },
  });

  if (!profesional) {
    throw new AppError('Perfil de profesional no encontrado.', 404);
  }

  const vinculoTurno = await prisma.turno.findFirst({
    where: {
      idProfesional: profesional.idProfesional,
      idPaciente,
    },
    select: { idTurno: true },
  });

  if (!vinculoTurno) {
    throw new AppError('No tenés permisos para interactuar con la información de este paciente.', 403);
  }

  return profesional;
}

/**
 * HU21 - Escenario 1 y 3: Lista los estudios activos del paciente autenticado.
 */
export async function listarMisEstudios(idUsuario: number) {
  await asegurarTablaEstudioMedico();
  const paciente = await obtenerPacientePorUsuario(idUsuario);

  const estudios = await prisma.estudioMedico.findMany({
    where: {
      idPaciente: paciente.idPaciente,
      estado: 'ACTIVO',
    },
    orderBy: {
      fechaCarga: 'desc',
    },
  });

  return estudios.map(mapearEstudioRespuesta);
}

/**
 * HU21 - Escenario 3: Obtiene el detalle de un estudio específico del paciente autenticado.
 */
export async function obtenerMiEstudioPorId(idUsuario: number, idEstudio: number) {
  await asegurarTablaEstudioMedico();
  const paciente = await obtenerPacientePorUsuario(idUsuario);

  const estudio = await prisma.estudioMedico.findFirst({
    where: {
      idEstudio,
      idPaciente: paciente.idPaciente,
      estado: 'ACTIVO',
    },
  });

  if (!estudio) {
    throw new AppError('Estudio médico no encontrado.', 404);
  }

  return mapearEstudioRespuesta(estudio);
}

/**
 * HU21 - Escenario 1: Alta de código de estudio médico asociado a la historia clínica del paciente.
 */

const ESPECIALIDADES_DIAGNOSTICAS_KEYWORDS = [
  'imagen',
  'radiolog',
  'bioquim',
  'laboratorio',
  'diagnostico',
  'ecograf',
  'patolog',
  'cardiolog',
  'tomograf',
  'resonanc',
];

/**
 * HU21: Valida si el profesional cuenta con especialidad diagnóstica (Opción A)
 * o con permiso administrativo configurable puedeCargarEstudios (Opción B).
 */
export async function profesionalTieneHabilitacionEstudios(profesional: {
  idProfesional: number;
  puedeCargarEstudios: boolean;
  especialidades?: { especialidad: { nombre: string } }[];
}): Promise<boolean> {
  // Opción B: Habilitación administrativa expresa
  if (profesional.puedeCargarEstudios) {
    return true;
  }

  // Opción A: Especialidad diagnóstica
  let especialidades = profesional.especialidades;
  if (!especialidades) {
    const profConEsp = await prisma.profesional.findUnique({
      where: { idProfesional: profesional.idProfesional },
      include: {
        especialidades: {
          include: { especialidad: true },
        },
      },
    });
    especialidades = profConEsp?.especialidades || [];
  }

  return especialidades.some((pe) => {
    const nombreEsp = pe.especialidad.nombre.toLowerCase();
    return ESPECIALIDADES_DIAGNOSTICAS_KEYWORDS.some((kw) => nombreEsp.includes(kw));
  });
}

export async function crearEstudio(
  _idUsuario: number,
  _datos: EstudioMedicoInput,
  _ip?: string
) {
  // HU21 Escenario 4: El paciente no tiene permisos de carga personal (solo lectura)
  throw new AppError(
    'No tenés permisos para cargar o gestionar estudios médicos. La gestión es realizada por los profesionales habilitados y el área de administración.',
    403
  );
}

/**
 * Carga de estudio médico directamente para un paciente específico.
 * Utilizado tanto por Especialistas durante la consulta médica como por el área de Administración.
 */
export async function crearEstudioParaPaciente(
  idUsuarioCreador: number,
  rolCreador: string,
  idPaciente: number,
  datos: {
    nombre: string;
    codigo?: string | null;
    observacion?: string | null;
  },
  ip?: string
) {
  await asegurarTablaEstudioMedico();

  const paciente = await prisma.paciente.findUnique({
    where: { idPaciente },
    include: { usuario: true },
  });

  if (!paciente) {
    throw new AppError('Paciente no encontrado.', 404);
  }

  let idProfesionalAsociado: number | null = null;

  if (rolCreador === 'PROFESIONAL') {
    const profesional = await prisma.profesional.findUnique({
      where: { idUsuario: idUsuarioCreador },
      include: {
        especialidades: {
          include: { especialidad: true },
        },
      },
    });

    if (!profesional) {
      throw new AppError('Perfil de profesional no encontrado.', 404);
    }

    const habilitado = await profesionalTieneHabilitacionEstudios(profesional);
    if (!habilitado) {
      throw new AppError(
        'No tenés permisos para cargar o gestionar estudios médicos. Se requiere especialidad diagnóstica o habilitación administrativa expresa.',
        403
      );
    }

    await verificarVinculoProfesionalPaciente(idUsuarioCreador, idPaciente);
    idProfesionalAsociado = profesional.idProfesional;
  } else if (rolCreador !== 'ADMINISTRATIVO') {
    throw new AppError(
      'No tenés permisos para cargar o gestionar estudios médicos. La gestión es realizada por los profesionales habilitados y el área de administración.',
      403
    );
  }

  const codigoFinal = datos.codigo?.trim() || generarCodigoEstudio();

  const nuevoEstudio = await prisma.$transaction(async (tx) => {
    const creado = await tx.estudioMedico.create({
      data: {
        idPaciente,
        idProfesional: idProfesionalAsociado,
        nombre: datos.nombre.trim(),
        codigo: codigoFinal,
        observacion: datos.observacion?.trim() ?? null,
        estado: 'ACTIVO',
      },
    });

    const accionAuditoria =
      rolCreador === 'ADMINISTRATIVO'
        ? 'ALTA_ESTUDIO_MEDICO_ADMIN'
        : 'ALTA_ESTUDIO_MEDICO_PROFESIONAL';

    await tx.auditoria.create({
      data: {
        idUsuario: idUsuarioCreador,
        fechaHora: new Date(),
        accion: accionAuditoria,
        tablaAfectada: 'estudio_medico',
        idRegistroAfectado: creado.idEstudio,
        datosNuevos: JSON.stringify({
          idEstudio: creado.idEstudio,
          idPaciente: creado.idPaciente,
          nombre: creado.nombre,
          codigo: creado.codigo,
          observacion: creado.observacion,
          rolCreador,
        }),
        ip,
        descripcion: `Alta de estudio médico "${creado.nombre}" para el paciente ${paciente.usuario.nombre} ${paciente.usuario.apellido} (código: ${creado.codigo}).`,
      },
    });

    return creado;
  });

  return {
    mensaje: 'Estudio médico registrado correctamente.',
    estudio: mapearEstudioRespuesta(nuevoEstudio),
  };
}

/**
 * Alta de estudio desde el módulo de Gestión de Estudios Médicos por parte de Administración.
 * Admite buscar el paciente por idPaciente o por dniPaciente.
 */
export async function crearEstudioAdmin(
  idUsuarioAdmin: number,
  datos: EstudioAdminCrearInput,
  ip?: string
) {
  let idPaciente = datos.idPaciente;

  if (!idPaciente && datos.dniPaciente) {
    const pacienteEncontrado = await prisma.paciente.findFirst({
      where: {
        usuario: {
          dni: datos.dniPaciente.trim(),
        },
      },
      select: { idPaciente: true },
    });

    if (!pacienteEncontrado) {
      throw new AppError('No se encontró ningún paciente con el DNI proporcionado.', 404);
    }
    idPaciente = pacienteEncontrado.idPaciente;
  }

  if (!idPaciente) {
    throw new AppError('Debe especificar un paciente válido.', 400);
  }

  return crearEstudioParaPaciente(
    idUsuarioAdmin,
    'ADMINISTRATIVO',
    idPaciente,
    {
      nombre: datos.nombre,
      codigo: datos.codigo,
      observacion: datos.observacion,
    },
    ip
  );
}

/**
 * Listado integral de estudios médicos para el panel de Gestión de Administración.
 * Soporta filtros por búsqueda textual (paciente o estudio), estado y paciente específico.
 */
export async function listarTodosLosEstudiosAdmin(filtros: {
  q?: string;
  estado?: string;
  idPaciente?: number;
}) {
  await asegurarTablaEstudioMedico();
  const { q, estado, idPaciente } = filtros;

  const whereClause: any = {};

  if (estado && estado !== 'TODOS') {
    whereClause.estado = estado;
  }

  if (idPaciente) {
    whereClause.idPaciente = idPaciente;
  }

  if (q && q.trim().length > 0) {
    const termino = q.trim();
    whereClause.OR = [
      { nombre: { contains: termino, mode: 'insensitive' } },
      { codigo: { contains: termino, mode: 'insensitive' } },
      {
        paciente: {
          usuario: {
            OR: [
              { nombre: { contains: termino, mode: 'insensitive' } },
              { apellido: { contains: termino, mode: 'insensitive' } },
              { dni: { contains: termino, mode: 'insensitive' } },
            ],
          },
        },
      },
    ];
  }

  const estudios = await prisma.estudioMedico.findMany({
    where: whereClause,
    include: {
      paciente: {
        include: {
          usuario: {
            select: {
              nombre: true,
              apellido: true,
              dni: true,
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
    },
    orderBy: {
      fechaCarga: 'desc',
    },
  });

  return estudios.map((est) => ({
    idEstudio: est.idEstudio,
    idPaciente: est.idPaciente,
    nombre: est.nombre,
    codigo: est.codigo,
    observacion: est.observacion,
    estado: est.estado,
    fechaCarga: est.fechaCarga,
    fechaActualizacion: est.fechaActualizacion,
    paciente: {
      idPaciente: est.paciente.idPaciente,
      nombreCompleto: `${est.paciente.usuario.nombre} ${est.paciente.usuario.apellido}`,
      dni: est.paciente.usuario.dni,
      email: est.paciente.usuario.email,
      telefono: est.paciente.usuario.telefono,
      obraSocial: est.paciente.plan
        ? `${est.paciente.plan.obraSocial.nombre} - ${est.paciente.plan.nombre}`
        : 'Particular',
    },
    integracionPacs: construirMetadatosPacs(est.codigo),
  }));
}

/**
 * Búsqueda predictiva de pacientes para asignación rápida de estudios en administración.
 */
export async function buscarPacientesParaEstudio(q?: string) {
  const termino = q?.trim() || '';
  const pacientes = await prisma.paciente.findMany({
    where: termino
      ? {
          OR: [
            { usuario: { dni: { contains: termino, mode: 'insensitive' } } },
            { usuario: { nombre: { contains: termino, mode: 'insensitive' } } },
            { usuario: { apellido: { contains: termino, mode: 'insensitive' } } },
          ],
        }
      : undefined,
    include: {
      usuario: {
        select: {
          nombre: true,
          apellido: true,
          dni: true,
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
    take: 20,
    orderBy: {
      usuario: {
        apellido: 'asc',
      },
    },
  });

  return pacientes.map((p) => ({
    idPaciente: p.idPaciente,
    dni: p.usuario.dni,
    nombre: p.usuario.nombre,
    apellido: p.usuario.apellido,
    nombreCompleto: `${p.usuario.nombre} ${p.usuario.apellido}`,
    email: p.usuario.email,
    telefono: p.usuario.telefono,
    planObraSocial: p.plan
      ? `${p.plan.obraSocial.nombre} - ${p.plan.nombre}`
      : 'Particular',
  }));
}

/**
 * Modificación genérica de estudio médico con control de permisos según rol (Administrativo, Profesional o Paciente).
 */
export async function actualizarEstudioGenerico(
  idUsuarioEditor: number,
  rolEditor: string,
  idEstudio: number,
  datos: EstudioActualizarInput,
  ip?: string
) {
  await asegurarTablaEstudioMedico();

  const estudioExistente = await prisma.estudioMedico.findUnique({
    where: { idEstudio },
  });

  if (!estudioExistente) {
    throw new AppError('Estudio médico no encontrado.', 404);
  }

  if (rolEditor === 'PACIENTE') {
    throw new AppError(
      'No tenés permisos para cargar o gestionar estudios médicos. La gestión es realizada por los profesionales habilitados y el área de administración.',
      403
    );
  } else if (rolEditor === 'PROFESIONAL') {
    const profesional = await prisma.profesional.findUnique({
      where: { idUsuario: idUsuarioEditor },
      include: {
        especialidades: {
          include: { especialidad: true },
        },
      },
    });
    if (!profesional) {
      throw new AppError('Perfil de profesional no encontrado.', 404);
    }
    const habilitado = await profesionalTieneHabilitacionEstudios(profesional);
    if (!habilitado) {
      throw new AppError('No tenés permisos para cargar o gestionar estudios médicos.', 403);
    }
    await verificarVinculoProfesionalPaciente(idUsuarioEditor, estudioExistente.idPaciente);
  } else if (rolEditor !== 'ADMINISTRATIVO') {
    throw new AppError('Rol no autorizado para modificar estudios médicos.', 403);
  }

  const datosAnteriores = {
    nombre: estudioExistente.nombre,
    codigo: estudioExistente.codigo,
    observacion: estudioExistente.observacion,
    estado: estudioExistente.estado,
  };

  const datosActualizacion: any = {};
  if (datos.nombre !== undefined) datosActualizacion.nombre = datos.nombre.trim();
  if (datos.codigo !== undefined) datosActualizacion.codigo = datos.codigo.trim();
  if (datos.observacion !== undefined) datosActualizacion.observacion = datos.observacion?.trim() ?? null;
  if (rolEditor === 'ADMINISTRATIVO' && datos.estado !== undefined) {
    datosActualizacion.estado = datos.estado;
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const est = await tx.estudioMedico.update({
      where: { idEstudio },
      data: datosActualizacion,
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idUsuarioEditor,
        fechaHora: new Date(),
        accion: 'MODIFICACION_ESTUDIO_MEDICO',
        tablaAfectada: 'estudio_medico',
        idRegistroAfectado: idEstudio,
        datosAnteriores: JSON.stringify(datosAnteriores),
        datosNuevos: JSON.stringify({
          ...datosActualizacion,
          rolEditor,
        }),
        ip,
        descripcion: `Modificación de estudio médico ID ${idEstudio} por usuario con rol ${rolEditor}.`,
      },
    });

    return est;
  });

  return {
    mensaje: 'Estudio médico actualizado correctamente.',
    estudio: mapearEstudioRespuesta(actualizado),
  };
}

/**
 * Eliminación o baja lógica de estudio médico.
 */
export async function eliminarEstudioGenerico(
  idUsuario: number,
  rol: string,
  idEstudio: number,
  ip?: string
) {
  await asegurarTablaEstudioMedico();

  const estudioExistente = await prisma.estudioMedico.findUnique({
    where: { idEstudio },
  });

  if (!estudioExistente) {
    throw new AppError('Estudio médico no encontrado.', 404);
  }

  if (rol === 'PACIENTE') {
    throw new AppError(
      'No tenés permisos para cargar o gestionar estudios médicos. La gestión es realizada por los profesionales habilitados y el área de administración.',
      403
    );
  } else if (rol === 'PROFESIONAL') {
    const profesional = await prisma.profesional.findUnique({
      where: { idUsuario },
      include: {
        especialidades: {
          include: { especialidad: true },
        },
      },
    });
    if (!profesional) {
      throw new AppError('Perfil de profesional no encontrado.', 404);
    }
    const habilitado = await profesionalTieneHabilitacionEstudios(profesional);
    if (!habilitado) {
      throw new AppError('No tenés permisos para cargar o gestionar estudios médicos.', 403);
    }
    await verificarVinculoProfesionalPaciente(idUsuario, estudioExistente.idPaciente);
  } else if (rol !== 'ADMINISTRATIVO') {
    throw new AppError('Rol no autorizado para eliminar estudios médicos.', 403);
  }

  await prisma.$transaction(async (tx) => {
    await tx.estudioMedico.update({
      where: { idEstudio },
      data: { estado: 'INACTIVO' },
    });

    await tx.auditoria.create({
      data: {
        idUsuario,
        fechaHora: new Date(),
        accion: 'BAJA_ESTUDIO_MEDICO',
        tablaAfectada: 'estudio_medico',
        idRegistroAfectado: idEstudio,
        datosAnteriores: JSON.stringify({
          nombre: estudioExistente.nombre,
          codigo: estudioExistente.codigo,
          estado: estudioExistente.estado,
        }),
        datosNuevos: JSON.stringify({ estado: 'INACTIVO', rol }),
        ip,
        descripcion: `Baja lógica de estudio médico ID ${idEstudio} por usuario con rol ${rol}.`,
      },
    });
  });

  return {
    mensaje: 'Estudio médico dado de baja correctamente.',
  };
}

/**
 * Cambio de estado (activar / inactivar) para panel administrativo.
 */
export async function cambiarEstadoEstudioAdmin(
  idUsuarioAdmin: number,
  idEstudio: number,
  nuevoEstado: 'ACTIVO' | 'INACTIVO',
  ip?: string
) {
  await asegurarTablaEstudioMedico();

  const estudioExistente = await prisma.estudioMedico.findUnique({
    where: { idEstudio },
  });

  if (!estudioExistente) {
    throw new AppError('Estudio médico no encontrado.', 404);
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const est = await tx.estudioMedico.update({
      where: { idEstudio },
      data: { estado: nuevoEstado },
    });

    await tx.auditoria.create({
      data: {
        idUsuario: idUsuarioAdmin,
        fechaHora: new Date(),
        accion: 'CAMBIO_ESTADO_ESTUDIO_MEDICO',
        tablaAfectada: 'estudio_medico',
        idRegistroAfectado: idEstudio,
        datosAnteriores: JSON.stringify({ estado: estudioExistente.estado }),
        datosNuevos: JSON.stringify({ estado: nuevoEstado }),
        ip,
        descripcion: `Cambio de estado de estudio médico ID ${idEstudio} a ${nuevoEstado} por administración.`,
      },
    });

    return est;
  });

  return {
    mensaje: `Estudio médico marcado como ${nuevoEstado} con éxito.`,
    estudio: mapearEstudioRespuesta(actualizado),
  };
}

/**
 * HU21 - Escenario 3: Edición de un estudio médico por parte del paciente propietario.
 */
export async function editarEstudio(
  idUsuario: number,
  idEstudio: number,
  datos: EstudioMedicoInput,
  ip?: string
) {
  return actualizarEstudioGenerico(idUsuario, 'PACIENTE', idEstudio, datos, ip);
}

/**
 * HU21 - Escenario 3: Eliminación (baja lógica) de un estudio médico por parte del paciente propietario.
 */
export async function eliminarEstudio(
  idUsuario: number,
  idEstudio: number,
  ip?: string
) {
  return eliminarEstudioGenerico(idUsuario, 'PACIENTE', idEstudio, ip);
}

/**
 * HU21 Escenario 3 y HU8 Escenario 4:
 * Permite al profesional con vínculo visualizar (solo lectura) los estudios médicos del paciente.
 */
export async function listarEstudiosDePacienteParaProfesional(
  idUsuarioProfesional: number,
  idPaciente: number
) {
  await asegurarTablaEstudioMedico();
  await verificarVinculoProfesionalPaciente(idUsuarioProfesional, idPaciente);

  const paciente = await prisma.paciente.findUnique({
    where: { idPaciente },
    include: {
      usuario: {
        select: {
          nombre: true,
          apellido: true,
          dni: true,
        },
      },
    },
  });

  if (!paciente) {
    throw new AppError('Paciente no encontrado.', 404);
  }

  const estudios = await prisma.estudioMedico.findMany({
    where: {
      idPaciente,
      estado: 'ACTIVO',
    },
    orderBy: {
      fechaCarga: 'desc',
    },
  });

  return {
    paciente: {
      idPaciente: paciente.idPaciente,
      nombreCompleto: `${paciente.usuario.nombre} ${paciente.usuario.apellido}`,
      dni: paciente.usuario.dni,
    },
    soloLectura: false,
    totalEstudios: estudios.length,
    estudios: estudios.map(mapearEstudioRespuesta),
  };
}

/**
 * HU8 (Escenarios 1, 2, 3 y 4) + HU17 + HU21:
 * Consulta integral de la Historia Clínica y Ficha Médica del paciente para el profesional con vínculo,
 * incluyendo datos básicos, antecedentes médicos, listado cronológico de consultas y estudios médicos cargados.
 */
export async function obtenerHistoriaClinicaPaciente(
  idUsuarioProfesional: number,
  idPaciente: number
) {
  await asegurarTablaEstudioMedico();
  await verificarVinculoProfesionalPaciente(idUsuarioProfesional, idPaciente);

  const paciente = await prisma.paciente.findUnique({
    where: { idPaciente },
    include: {
      usuario: {
        select: {
          nombre: true,
          apellido: true,
          dni: true,
          email: true,
          telefono: true,
        },
      },
      plan: {
        include: {
          obraSocial: true,
        },
      },
      antecedentes: true,
      estudios: {
        where: { estado: 'ACTIVO' },
        orderBy: { fechaCarga: 'desc' },
      },
      turnos: {
        where: {
          consulta: {
            isNot: null,
          },
        },
        include: {
          consulta: true,
          profesional: {
            include: {
              usuario: {
                select: {
                  nombre: true,
                  apellido: true,
                },
              },
              especialidades: {
                where: { estado: 'ACTIVO' },
                include: {
                  especialidad: true,
                },
              },
            },
          },
        },
        orderBy: {
          fechaHora: 'desc',
        },
      },
    },
  });

  if (!paciente) {
    throw new AppError('Paciente no encontrado.', 404);
  }

  const tieneAntecedentes = Boolean(
    paciente.antecedentes &&
      (paciente.antecedentes.alergias ||
        paciente.antecedentes.enfermedadesCronicas ||
        paciente.antecedentes.grupoSanguineo)
  );

  const consultasPrevias = paciente.turnos
    .filter((t) => t.consulta !== null)
    .map((t) => ({
      idConsulta: t.consulta!.idConsulta,
      idTurno: t.idTurno,
      fechaTurno: t.fechaHora,
      fechaRealizacion: t.consulta!.fechaRealizacion,
      motivoConsulta: t.consulta!.motivoConsulta,
      diagnostico: t.consulta!.diagnostico,
      tratamiento: t.consulta!.tratamiento,
      notasAdicionales: t.consulta!.notasAdicionales,
      profesional: {
        idProfesional: t.profesional.idProfesional,
        nombreCompleto: `${t.profesional.usuario.nombre} ${t.profesional.usuario.apellido}`,
        matricula: t.profesional.matricula,
        especialidades: t.profesional.especialidades.map((e) => e.especialidad.nombre),
      },
    }));

  return {
    datosBasicos: {
      idPaciente: paciente.idPaciente,
      nombreCompleto: `${paciente.usuario.nombre} ${paciente.usuario.apellido}`,
      nombre: paciente.usuario.nombre,
      apellido: paciente.usuario.apellido,
      dni: paciente.usuario.dni,
      edad: calcularEdad(paciente.fechaNacimiento),
      fechaNacimiento: paciente.fechaNacimiento,
      sexo: paciente.sexo,
      telefono: paciente.usuario.telefono,
      email: paciente.usuario.email,
      obraSocialPlan: paciente.plan
        ? `${paciente.plan.obraSocial.nombre} - ${paciente.plan.nombre}`
        : 'Particular',
    },
    antecedentes: tieneAntecedentes ? paciente.antecedentes : null,
    mensajeAntecedentes: tieneAntecedentes ? null : 'El paciente no cargó antecedentes',
    consultas: consultasPrevias,
    mensajeConsultas:
      consultasPrevias.length > 0 ? null : 'Este paciente no registra consultas previas',
    estudios: paciente.estudios.map(mapearEstudioRespuesta),
    mensajeEstudios:
      paciente.estudios.length > 0 ? null : 'El paciente no registra estudios médicos',
  };
}

/**
 * Consulta el estado y metadatos del estudio en el PACS Orthanc a partir del idEstudio registrado.
 * Puede ser invocado por el paciente propietario, por un profesional con vínculo o por administración.
 */
export async function consultarEstadoEstudioEnPacs(
  idUsuario: number,
  idEstudio: number,
  rol: string
) {
  await asegurarTablaEstudioMedico();

  let estudio;
  if (rol === 'PACIENTE') {
    const paciente = await obtenerPacientePorUsuario(idUsuario);
    estudio = await prisma.estudioMedico.findFirst({
      where: {
        idEstudio,
        idPaciente: paciente.idPaciente,
        estado: 'ACTIVO',
      },
    });
  } else if (rol === 'PROFESIONAL') {
    estudio = await prisma.estudioMedico.findFirst({
      where: {
        idEstudio,
        estado: 'ACTIVO',
      },
    });
    if (estudio) {
      await verificarVinculoProfesionalPaciente(idUsuario, estudio.idPaciente);
    }
  } else {
    // ADMINISTRATIVO u otros roles autorizados
    estudio = await prisma.estudioMedico.findFirst({
      where: {
        idEstudio,
      },
    });
  }

  if (!estudio) {
    throw new AppError('Estudio médico no encontrado.', 404);
  }

  const resultadoPacs = await buscarEstudioEnPacs(estudio.codigo);

  return {
    estudio: mapearEstudioRespuesta(estudio),
    pacs: resultadoPacs,
  };
}

/**
 * HU21: Genera y devuelve el informe médico oficial en PDF para un estudio registrado.
 * Puede ser consultado por el paciente propietario, un profesional con vínculo o administración.
 */
export async function generarInformePdfEstudio(
  idUsuario: number,
  idEstudio: number,
  rol?: string
): Promise<Buffer> {
  await asegurarTablaEstudioMedico();

  const estudio = await prisma.estudioMedico.findFirst({
    where: {
      idEstudio,
    },
    include: {
      profesional: {
        include: {
          usuario: true,
        },
      },
      paciente: {
        include: {
          usuario: true,
          plan: {
            include: {
              obraSocial: true,
            },
          },
        },
      },
    },
  });

  if (!estudio) {
    throw new AppError('Estudio médico no encontrado.', 404);
  }

  // Verificación de permisos según rol
  if (rol === 'PACIENTE') {
    const paciente = await obtenerPacientePorUsuario(idUsuario);
    if (estudio.idPaciente !== paciente.idPaciente) {
      throw new AppError('No tenés permisos para ver el informe de este estudio.', 403);
    }
  } else if (rol === 'PROFESIONAL') {
    await verificarVinculoProfesionalPaciente(idUsuario, estudio.idPaciente);
  }

  return generarPdfInformeEstudio({
    idEstudio: estudio.idEstudio,
    nombre: estudio.nombre,
    codigo: estudio.codigo,
    observacion: estudio.observacion,
    fechaCarga: estudio.fechaCarga,
    paciente: estudio.paciente,
    profesional: estudio.profesional,
  });
}
