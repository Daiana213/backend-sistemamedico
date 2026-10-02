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

export async function obtenerAgendaProfesional(filtros: FiltrosAgenda) {
  // 1. Obtener el ID del Profesional (Aislamiento de Datos)
  const profesional = await prisma.profesional.findUnique({
    where: { idUsuario: filtros.idUsuario },
    select: { idProfesional: true },
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
    // Check if the provided state is a valid enum value
    const uppercaseEstado = filtros.estado.toUpperCase();
    if (Object.values(EstadoTurno).includes(uppercaseEstado as EstadoTurno)) {
      whereClause.estado = uppercaseEstado as EstadoTurno;
    }
  }

  // Filtros: Rango de fechas (Escenarios 1, 2 y 4)
  if (filtros.fecha) {
    // Agenda Diaria (Inicio del día hasta fin del día)
    const inicioDia = new Date(`${filtros.fecha}T00:00:00.000Z`);
    const finDia = new Date(`${filtros.fecha}T23:59:59.999Z`);
    
    whereClause.fechaHora = {
      gte: inicioDia,
      lte: finDia,
    };
  } else if (filtros.fechaInicio && filtros.fechaFin) {
    // Historial por rango de fechas
    const inicioRango = new Date(`${filtros.fechaInicio}T00:00:00.000Z`);
    const finRango = new Date(`${filtros.fechaFin}T23:59:59.999Z`);

    whereClause.fechaHora = {
      gte: inicioRango,
      lte: finRango,
    };
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
    resumen: {
      totalTurnos: turnosMapeados.length,
      rango: filtros.fecha || `${filtros.fechaInicio} a ${filtros.fechaFin}` || 'Todos los tiempos',
    },
    turnos: turnosMapeados,
  };
}
