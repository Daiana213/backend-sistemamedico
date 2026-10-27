import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { calcularEdad } from '../utils/edad';
import { EstudioMedicoInput } from '../validations/estudioValidation';
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
    tablaVerificada = true;
  } catch {
    // Si falla por permisos DDL restringidos pero la tabla ya existe por migración, continuar
    tablaVerificada = true;
  }
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
    nombre: estudio.nombre,
    codigo: estudio.codigo,
    observacion: estudio.observacion,
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
export async function crearEstudio(
  idUsuario: number,
  datos: EstudioMedicoInput,
  ip?: string
) {
  await asegurarTablaEstudioMedico();
  const paciente = await obtenerPacientePorUsuario(idUsuario);

  const nuevoEstudio = await prisma.$transaction(async (tx) => {
    const creado = await tx.estudioMedico.create({
      data: {
        idPaciente: paciente.idPaciente,
        nombre: datos.nombre,
        codigo: datos.codigo,
        observacion: datos.observacion ?? null,
        estado: 'ACTIVO',
      },
    });

    await tx.auditoria.create({
      data: {
        idUsuario,
        fechaHora: new Date(),
        accion: 'ALTA_ESTUDIO_MEDICO',
        tablaAfectada: 'estudio_medico',
        idRegistroAfectado: creado.idEstudio,
        datosNuevos: JSON.stringify({
          idEstudio: creado.idEstudio,
          idPaciente: creado.idPaciente,
          nombre: creado.nombre,
          codigo: creado.codigo,
          observacion: creado.observacion,
        }),
        ip,
        descripcion: `Alta de estudio médico "${creado.nombre}" (código: ${creado.codigo}).`,
      },
    });

    return creado;
  });

  return {
    mensaje: 'Estudio agregado correctamente.',
    estudio: mapearEstudioRespuesta(nuevoEstudio),
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
  await asegurarTablaEstudioMedico();
  const paciente = await obtenerPacientePorUsuario(idUsuario);

  const estudioExistente = await prisma.estudioMedico.findFirst({
    where: {
      idEstudio,
      idPaciente: paciente.idPaciente,
      estado: 'ACTIVO',
    },
  });

  if (!estudioExistente) {
    throw new AppError('Estudio médico no encontrado.', 404);
  }

  const datosAnteriores = {
    nombre: estudioExistente.nombre,
    codigo: estudioExistente.codigo,
    observacion: estudioExistente.observacion,
  };

  const actualizado = await prisma.$transaction(async (tx) => {
    const est = await tx.estudioMedico.update({
      where: { idEstudio },
      data: {
        nombre: datos.nombre,
        codigo: datos.codigo,
        observacion: datos.observacion ?? null,
      },
    });

    await tx.auditoria.create({
      data: {
        idUsuario,
        fechaHora: new Date(),
        accion: 'MODIFICACION_ESTUDIO_MEDICO',
        tablaAfectada: 'estudio_medico',
        idRegistroAfectado: idEstudio,
        datosAnteriores: JSON.stringify(datosAnteriores),
        datosNuevos: JSON.stringify({
          nombre: est.nombre,
          codigo: est.codigo,
          observacion: est.observacion,
        }),
        ip,
        descripcion: `Modificación de estudio médico "${est.nombre}" (código: ${est.codigo}).`,
      },
    });

    return est;
  });

  return {
    mensaje: 'Estudio actualizado correctamente.',
    estudio: mapearEstudioRespuesta(actualizado),
  };
}

/**
 * HU21 - Escenario 3: Eliminación (baja lógica) de un estudio médico por parte del paciente propietario.
 */
export async function eliminarEstudio(
  idUsuario: number,
  idEstudio: number,
  ip?: string
) {
  await asegurarTablaEstudioMedico();
  const paciente = await obtenerPacientePorUsuario(idUsuario);

  const estudioExistente = await prisma.estudioMedico.findFirst({
    where: {
      idEstudio,
      idPaciente: paciente.idPaciente,
      estado: 'ACTIVO',
    },
  });

  if (!estudioExistente) {
    throw new AppError('Estudio médico no encontrado.', 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.estudioMedico.update({
      where: { idEstudio },
      data: {
        estado: 'INACTIVO',
      },
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
          observacion: estudioExistente.observacion,
          estado: estudioExistente.estado,
        }),
        datosNuevos: JSON.stringify({ estado: 'INACTIVO' }),
        ip,
        descripcion: `Eliminación de estudio médico "${estudioExistente.nombre}" (código: ${estudioExistente.codigo}).`,
      },
    });
  });

  return {
    mensaje: 'Estudio eliminado correctamente.',
  };
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
    throw new AppError('No tenés permisos para ver la información de este paciente', 403);
  }

  return profesional;
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
    soloLectura: true,
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
      paciente.estudios.length > 0 ? null : 'El paciente no cargó estudios médicos',
  };
}


/**
 * Consulta el estado y metadatos del estudio en el PACS Orthanc a partir del idEstudio registrado.
 * Puede ser invocado por el paciente propietario o por un profesional con vínculo.
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
    estudio = await prisma.estudioMedico.findFirst({
      where: {
        idEstudio,
        estado: 'ACTIVO',
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
 * Puede ser consultado por el paciente propietario o por un profesional con vínculo (o administrativo).
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
      estado: 'ACTIVO',
    },
    include: {
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
  });
}

