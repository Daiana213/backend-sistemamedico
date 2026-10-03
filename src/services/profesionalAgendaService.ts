import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { Prisma, EstadoTurno } from '@prisma/client';

export interface FiltrosAgenda {
  idUsuario: number;
  fecha?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: string;
}

// Argentina (America/Argentina/Buenos_Aires) es UTC-3 todo el año (sin horario de verano).
// fechaHora se guarda en UTC, por lo que los límites de día se calculan con offset -03:00.
const OFFSET_ARGENTINA = '-03:00';
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function limitesDiaArgentina(fecha: string, nombreParam: string) {
  const inicio = new Date(`${fecha}T00:00:00.000${OFFSET_ARGENTINA}`);
  const fin = new Date(`${fecha}T23:59:59.999${OFFSET_ARGENTINA}`);
  if (!FORMATO_FECHA.test(fecha) || isNaN(inicio.getTime())) {
    throw new AppError(`El parámetro ${nombreParam} debe tener formato YYYY-MM-DD.`, 400);
  }
  return { inicio, fin };
}

export async function obtenerAgendaProfesional(filtros: FiltrosAgenda) {
  // 1. Obtener el Profesional desde el token (Aislamiento de Datos)
  const profesional = await prisma.profesional.findUnique({
    where: { idUsuario: filtros.idUsuario },
    select: {
      idProfesional: true,
      matricula: true,
      usuario: { select: { nombre: true, apellido: true } },
    },
  });

  if (!profesional) {
    throw new AppError('Perfil de profesional no encontrado.', 404);
  }

  // 2. Construcción Dinámica de la Query (Query Builder)
  const whereClause: Prisma.TurnoWhereInput = {
    // CONDICIÓN INQUEBRANTABLE: Solo turnos de este profesional
    idProfesional: profesional.idProfesional,
  };

  // Filtro: Estado
  if (filtros.estado) {
    const uppercaseEstado = filtros.estado.toUpperCase();
    if (!Object.values(EstadoTurno).includes(uppercaseEstado as EstadoTurno)) {
      throw new AppError(
        `Estado inválido. Valores permitidos: ${Object.values(EstadoTurno).join(', ')}.`,
        400
      );
    }
    whereClause.estado = uppercaseEstado as EstadoTurno;
  }

  // Filtros: Rango de fechas (día calendario en zona horaria de Argentina)
  let rango = 'Todos los tiempos';
  if (filtros.fecha) {
    const { inicio, fin } = limitesDiaArgentina(filtros.fecha, 'fecha');
    whereClause.fechaHora = { gte: inicio, lte: fin };
    rango = filtros.fecha;
  } else if (filtros.fechaInicio && filtros.fechaFin) {
    const { inicio } = limitesDiaArgentina(filtros.fechaInicio, 'fechaInicio');
    const { fin } = limitesDiaArgentina(filtros.fechaFin, 'fechaFin');
    if (inicio > fin) {
      throw new AppError('fechaInicio no puede ser posterior a fechaFin.', 400);
    }
    whereClause.fechaHora = { gte: inicio, lte: fin };
    rango = `${filtros.fechaInicio} a ${filtros.fechaFin}`;
  }

  // 3. Ejecución de la consulta a la Base de Datos
  const turnos = await prisma.turno.findMany({
    where: whereClause,
    orderBy: {
      fechaHora: 'asc', // Orden cronológico crítico para la agenda
    },
    // Escenario 5: Relaciones selectivas para devolver metadata exacta
    select: {
      idTurno: true,
      fechaHora: true,
      estado: true,
      motivoCancelacion: true,
      paciente: {
        select: {
          idPaciente: true, // REQUISITO: Para el enlace a Historia Clínica (HU8)
          usuario: {
            select: {
              nombre: true,
              apellido: true,
              dni: true,
              telefono: true,
            }
          },
          plan: {
            select: {
              nombre: true,
              obraSocial: { select: { nombre: true } }
            }
          }
        }
      }
    }
  });

  // Mapeo final para limpiar la respuesta y adaptarla al frontend
  const turnosMapeados = turnos.map(turno => ({
    idTurno: turno.idTurno,
    fechaHora: turno.fechaHora,
    estado: turno.estado,
    motivoCancelacion: turno.motivoCancelacion,
    paciente: {
      idPaciente: turno.paciente.idPaciente,
      nombreCompleto: `${turno.paciente.usuario.nombre} ${turno.paciente.usuario.apellido}`,
      dni: turno.paciente.usuario.dni,
      telefono: turno.paciente.usuario.telefono,
      planObraSocial: turno.paciente.plan 
        ? `${turno.paciente.plan.obraSocial.nombre} - ${turno.paciente.plan.nombre}`
        : 'Particular'
    }
  }));

  return {
    profesional: {
      nombreCompleto: `${profesional.usuario.nombre} ${profesional.usuario.apellido}`,
      matricula: profesional.matricula,
    },
    resumen: {
      totalTurnos: turnosMapeados.length,
      rango,
    },
    turnos: turnosMapeados,
  };
}
