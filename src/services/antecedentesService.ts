import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

interface AntecedentesInput {
  alergias?: string | null;
  enfermedadesCronicas?: string | null;
  grupoSanguineo?: string | null;
}

export async function obtenerAntecedentes(idUsuario: number) {
  const paciente = await prisma.paciente.findUnique({
    where: { idUsuario },
    include: { antecedentes: true }
  });

  if (!paciente) {
    throw new AppError('Paciente no encontrado.', 404);
  }

  return paciente.antecedentes || null;
}

export async function upsertAntecedentes(idUsuario: number, datos: AntecedentesInput, ip?: string) {
  const paciente = await prisma.paciente.findUnique({
    where: { idUsuario },
    include: { antecedentes: true }
  });

  if (!paciente) {
    throw new AppError('Paciente no encontrado.', 404);
  }

  const { idPaciente, antecedentes: antecedentesAnteriores } = paciente;

  return await prisma.$transaction(async (tx) => {
    let antecedentesActualizados;
    let accion = 'ALTA_ANTECEDENTES';
    let descripcion = 'Carga inicial de antecedentes médicos';

    if (antecedentesAnteriores) {
      antecedentesActualizados = await tx.antecedentesMedicos.update({
        where: { idPaciente },
        data: {
          alergias: datos.alergias,
          enfermedadesCronicas: datos.enfermedadesCronicas,
          grupoSanguineo: datos.grupoSanguineo,
        }
      });
      accion = 'MODIFICACION_ANTECEDENTES';
      descripcion = 'Actualización de antecedentes médicos';
    } else {
      antecedentesActualizados = await tx.antecedentesMedicos.create({
        data: {
          idPaciente,
          alergias: datos.alergias,
          enfermedadesCronicas: datos.enfermedadesCronicas,
          grupoSanguineo: datos.grupoSanguineo,
        }
      });
    }

    await tx.auditoria.create({
      data: {
        idUsuario,
        fechaHora: new Date(),
        accion,
        tablaAfectada: 'antecedentes_medicos',
        idRegistroAfectado: antecedentesActualizados.idAntecedentes,
        datosAnteriores: antecedentesAnteriores ? JSON.stringify(antecedentesAnteriores) : null,
        datosNuevos: JSON.stringify(antecedentesActualizados),
        descripcion,
        ip,
      }
    });

    return antecedentesActualizados;
  });
}
