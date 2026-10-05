import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { EstadoTurno } from '@prisma/client';

interface CrearConsultaDto {
  idTurno: number;
  motivoConsulta: string;
  diagnostico: string;
  tratamiento: string;
  notasAdicionales?: string;
}

export const registrarConsulta = async (data: CrearConsultaDto, usuarioLogueado: any) => {
  // Check if the Turno exists
  const turno = await prisma.turno.findUnique({
    where: { idTurno: data.idTurno },
    include: {
      profesional: true
    }
  });

  if (!turno) {
    throw new AppError('Turno no encontrado.', 404);
  }

  // Check if the user is the professional assigned to the Turno
  if (turno.profesional.idUsuario !== usuarioLogueado.idUsuario) {
    throw new AppError('No tiene permisos para registrar una consulta para este turno.', 403);
  }

  if (turno.estado === EstadoTurno.COMPLETADO) {
    throw new AppError('El turno ya se encuentra completado.', 400);
  }

  // Create the consulta and update the Turno state to COMPLETADO in a transaction
  const [consulta, turnoActualizado] = await prisma.$transaction([
    prisma.consulta.create({
      data: {
        idTurno: data.idTurno,
        motivoConsulta: data.motivoConsulta,
        diagnostico: data.diagnostico,
        tratamiento: data.tratamiento,
        notasAdicionales: data.notasAdicionales,
      }
    }),
    prisma.turno.update({
      where: { idTurno: data.idTurno },
      data: { estado: EstadoTurno.COMPLETADO }
    })
  ]);

  return consulta;
};
