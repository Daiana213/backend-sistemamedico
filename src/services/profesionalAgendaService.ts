import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { Prisma, EstadoTurno } from '@prisma/client';
import { ConfigurarAgendaDTO } from '../validations/agendaValidation';

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

export async function configurarAgenda(idProfesional: number, data: ConfigurarAgendaDTO, usuarioAdminId: number) {
  const { agendas } = data;

  // 1. Validar solapamientos internos
  validarSolapamientosInternos(agendas);

  // 2. Comprobar si existen turnos afectados
  const turnosAfectados = await obtenerTurnosAfectados(idProfesional, agendas);

  if (turnosAfectados.length > 0) {
    throw new AppError('Hay turnos reservados o confirmados en los horarios que quieres eliminar o modificar.', 409, { turnosAfectados });
  }

  // 3. Ejecutar actualización atómica
  await prisma.$transaction(async (tx) => {
    // Eliminar agenda anterior
    await tx.agendaProfesional.deleteMany({
      where: { idProfesional }
    });

    // Crear la nueva agenda
    await tx.agendaProfesional.createMany({
      data: agendas.map(a => ({
        ...a,
        idProfesional
      }))
    });

    // Registrar auditoría
    await tx.auditoria.create({
      data: {
        idUsuario: usuarioAdminId,
        fechaHora: new Date(),
        accion: 'CONFIGURAR_AGENDA_PROFESIONAL',
        tablaAfectada: 'agenda_profesional',
        descripcion: `Se configuró la agenda del profesional con ID ${idProfesional}. Franjas: ${agendas.length}`
      }
    });
  });

  return { message: 'Agenda configurada correctamente' };
}

function validarSolapamientosInternos(agendas: ConfigurarAgendaDTO['agendas']) {
  const porDia: Record<number, typeof agendas> = {};
  agendas.forEach(a => {
    if (!porDia[a.diaSemana]) porDia[a.diaSemana] = [];
    porDia[a.diaSemana].push(a);
  });

  for (const dia in porDia) {
    const franjas = porDia[dia].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    for (let i = 0; i < franjas.length - 1; i++) {
      if (franjas[i + 1].horaInicio < franjas[i].horaFin) {
        throw new AppError('Las franjas horarias no pueden superponerse en el mismo día.', 400);
      }
    }
  }
}

async function obtenerTurnosAfectados(idProfesional: number, nuevasAgendas: ConfigurarAgendaDTO['agendas']) {
  const hoy = new Date();

  const turnosFuturos = await prisma.turno.findMany({
    where: {
      idProfesional,
      fechaHora: { gte: hoy },
      estado: { in: ['SOLICITADO', 'CONFIRMADO'] } // Mapeado a los estados en el schema
    }
  });

  const turnosAfectados = turnosFuturos.filter(turno => {
    // Calcular el día de la semana en la zona horaria local de Argentina (UTC-3)
    const fechaTurno = new Date(turno.fechaHora);
    // Ajustar offset para obtener día y hora en Argentina
    const utcOffset = -3 * 60; // en minutos
    const fechaLocal = new Date(fechaTurno.getTime() + utcOffset * 60000);
    
    const diaSemanaTurno = fechaLocal.getUTCDay();
    const hora = fechaLocal.getUTCHours().toString().padStart(2, '0');
    const minuto = fechaLocal.getUTCMinutes().toString().padStart(2, '0');
    const horaInicioTurno = `${hora}:${minuto}`;

    const franjasParaElDia = nuevasAgendas.filter(a => a.diaSemana === diaSemanaTurno);
    
    if (franjasParaElDia.length === 0) return true; // No hay franjas, turno afectado

    // Comprobar si el turno cae dentro de la franja (suponemos que solo evaluamos el inicio del turno)
    const estaEnFranja = franjasParaElDia.some(franja => {
      // Deberíamos comprobar también que la horaInicioTurno + duracion esté dentro de la franja.
      // Por simplicidad, comprobaremos que horaInicioTurno sea >= franja.horaInicio y < franja.horaFin
      return horaInicioTurno >= franja.horaInicio && horaInicioTurno < franja.horaFin;
    });

    return !estaEnFranja;
  });

  return turnosAfectados;
}

export async function obtenerDisponibilidad(idProfesional: number, fecha: string) {
  const { inicio, fin } = limitesDiaArgentina(fecha, 'fecha');
  
  // 1. Validar que la fecha sea futura o de hoy
  const hoy = new Date();
  // Se podría agregar validación estricta de fecha futura

  // 2. Obtener la agenda del profesional para el día de la semana de "fecha"
  // utcOffset para Argentina: -3 horas
  const utcOffset = -3 * 60;
  const fechaLocal = new Date(inicio.getTime() + utcOffset * 60000);
  const diaSemana = fechaLocal.getUTCDay();

  const agendas = await prisma.agendaProfesional.findMany({
    where: {
      idProfesional,
      diaSemana,
      estado: 'ACTIVO'
    }
  });

  if (agendas.length === 0) {
    return {
      idProfesional,
      fecha,
      turnosDisponibles: []
    };
  }

  // 3. Generar todos los slots posibles basados en las franjas de la agenda
  const slotsPosibles: string[] = [];
  
  agendas.forEach(agenda => {
    let horaActualStr = agenda.horaInicio;
    
    while (horaActualStr < agenda.horaFin) {
      slotsPosibles.push(horaActualStr);
      
      // Sumar la duración
      const [h, m] = horaActualStr.split(':').map(Number);
      const minutosTotales = h * 60 + m + agenda.duracionTurnoMinutos;
      
      const nextH = Math.floor(minutosTotales / 60).toString().padStart(2, '0');
      const nextM = (minutosTotales % 60).toString().padStart(2, '0');
      horaActualStr = `${nextH}:${nextM}`;
      
      // Si el siguiente turno termina después de la horaFin, se descarta y sale del loop
      if (horaActualStr > agenda.horaFin) {
        break;
      }
    }
  });

  // Ordenar slots
  slotsPosibles.sort();

  // 4. Obtener turnos ya ocupados en ese día
  const turnosOcupados = await prisma.turno.findMany({
    where: {
      idProfesional,
      fechaHora: {
        gte: inicio,
        lte: fin
      },
      estado: {
        in: ['SOLICITADO', 'CONFIRMADO']
      }
    }
  });

  // Mapear turnos ocupados a formato "HH:mm" en hora local (Argentina)
  const horasOcupadas = turnosOcupados.map(turno => {
    const fechaTurno = new Date(turno.fechaHora);
    const fechaTurnoLocal = new Date(fechaTurno.getTime() + utcOffset * 60000);
    const h = fechaTurnoLocal.getUTCHours().toString().padStart(2, '0');
    const m = fechaTurnoLocal.getUTCMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  });

  // 5. Filtrar los slots posibles quitando los ocupados
  const turnosDisponibles = slotsPosibles.filter(slot => !horasOcupadas.includes(slot));

  // Filtrar turnos pasados si la fecha es hoy
  const esHoy = fechaLocal.toISOString().split('T')[0] === new Date(hoy.getTime() + utcOffset * 60000).toISOString().split('T')[0];
  let turnosFinales = turnosDisponibles;
  
  if (esHoy) {
    const ahoraLocal = new Date(hoy.getTime() + utcOffset * 60000);
    const hActual = ahoraLocal.getUTCHours().toString().padStart(2, '0');
    const mActual = ahoraLocal.getUTCMinutes().toString().padStart(2, '0');
    const horaActualStr = `${hActual}:${mActual}`;
    
    turnosFinales = turnosDisponibles.filter(slot => slot >= horaActualStr);
  }

  return {
    idProfesional,
    fecha,
    turnosDisponibles: turnosFinales
  };
}
