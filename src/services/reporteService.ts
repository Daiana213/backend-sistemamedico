import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

// Zona horaria de Argentina (UTC-3 fija todo el año)
const OFFSET_ARGENTINA = '-03:00';
const OFFSET_MINUTOS_ARGENTINA = -3 * 60;
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const NOMBRES_DIAS_SEMANA: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

export interface FiltrosMetricas {
  periodo?: 'mes_actual' | 'mes_anterior' | 'ultimos_30_dias' | 'personalizado';
  fechaInicio?: string;
  fechaFin?: string;
  idEspecialidad?: number;
  idProfesional?: number;
}

export type CategoriaEstadoMetrica =
  | 'REALIZADO'
  | 'CANCELADO'
  | 'AUSENTE'
  | 'REPROGRAMADO'
  | 'PENDIENTE';

function redondear(valor: number, decimales = 2): number {
  const factor = Math.pow(10, decimales);
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}

function aFechaLocalArgentina(fecha: Date): Date {
  return new Date(fecha.getTime() + OFFSET_MINUTOS_ARGENTINA * 60000);
}

function formatearFechaYYYYMMDD(fechaLocalArg: Date): string {
  const y = fechaLocalArg.getUTCFullYear();
  const m = String(fechaLocalArg.getUTCMonth() + 1).padStart(2, '0');
  const d = String(fechaLocalArg.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function limitesDiaArgentina(fecha: string, nombreParam: string) {
  if (!FORMATO_FECHA.test(fecha)) {
    throw new AppError(`El parámetro ${nombreParam} debe tener formato YYYY-MM-DD.`, 400);
  }
  const inicio = new Date(`${fecha}T00:00:00.000${OFFSET_ARGENTINA}`);
  const fin = new Date(`${fecha}T23:59:59.999${OFFSET_ARGENTINA}`);
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    throw new AppError(`El parámetro ${nombreParam} no es una fecha válida.`, 400);
  }
  return { inicio, fin };
}

/**
 * Resuelve el rango [inicio, fin] del período seleccionado y el período anterior equivalente
 * para calcular variaciones porcentuales (Δ%).
 */
export function resolverRangoPeriodo(filtros: FiltrosMetricas) {
  const ahora = new Date();
  const ahoraArg = aFechaLocalArgentina(ahora);
  let inicio: Date;
  let fin: Date;
  let etiquetaPeriodo: string;
  let tipoPeriodo = filtros.periodo || 'mes_actual';

  // Si se envían fechaInicio y fechaFin explícitamente, se prioriza el rango personalizado
  if (filtros.fechaInicio && filtros.fechaFin) {
    tipoPeriodo = 'personalizado';
    const limIni = limitesDiaArgentina(filtros.fechaInicio, 'fechaInicio');
    const limFin = limitesDiaArgentina(filtros.fechaFin, 'fechaFin');
    inicio = limIni.inicio;
    fin = limFin.fin;
    if (inicio > fin) {
      throw new AppError('fechaInicio no puede ser posterior a fechaFin.', 400);
    }
    etiquetaPeriodo = `${filtros.fechaInicio} a ${filtros.fechaFin}`;
  } else if (tipoPeriodo === 'ultimos_30_dias') {
    const fechaFinStr = formatearFechaYYYYMMDD(ahoraArg);
    const hace29DiasArg = new Date(ahoraArg.getTime() - 29 * 24 * 60 * 60 * 1000);
    const fechaIniStr = formatearFechaYYYYMMDD(hace29DiasArg);
    inicio = limitesDiaArgentina(fechaIniStr, 'fechaInicio').inicio;
    fin = limitesDiaArgentina(fechaFinStr, 'fechaFin').fin;
    etiquetaPeriodo = `Últimos 30 días (${fechaIniStr} a ${fechaFinStr})`;
  } else if (tipoPeriodo === 'mes_anterior') {
    const anioActual = ahoraArg.getUTCFullYear();
    const mesActual = ahoraArg.getUTCMonth(); // 0-indexed
    const primerDiaMesAnterior = new Date(Date.UTC(anioActual, mesActual - 1, 1));
    const ultimoDiaMesAnterior = new Date(Date.UTC(anioActual, mesActual, 0));
    const fechaIniStr = formatearFechaYYYYMMDD(primerDiaMesAnterior);
    const fechaFinStr = formatearFechaYYYYMMDD(ultimoDiaMesAnterior);
    inicio = limitesDiaArgentina(fechaIniStr, 'fechaInicio').inicio;
    fin = limitesDiaArgentina(fechaFinStr, 'fechaFin').fin;
    etiquetaPeriodo = `Mes anterior (${fechaIniStr} a ${fechaFinStr})`;
  } else {
    // Por defecto: 'mes_actual' (Escenario 1: total de turnos del mes)
    const anio = ahoraArg.getUTCFullYear();
    const mes = ahoraArg.getUTCMonth();
    const primerDiaMes = new Date(Date.UTC(anio, mes, 1));
    const ultimoDiaMes = new Date(Date.UTC(anio, mes + 1, 0));
    const fechaIniStr = formatearFechaYYYYMMDD(primerDiaMes);
    const fechaFinStr = formatearFechaYYYYMMDD(ultimoDiaMes);
    inicio = limitesDiaArgentina(fechaIniStr, 'fechaInicio').inicio;
    fin = limitesDiaArgentina(fechaFinStr, 'fechaFin').fin;
    etiquetaPeriodo = `Mes actual (${fechaIniStr} a ${fechaFinStr})`;
  }

  // Período anterior equivalente (misma duración inmediatamente previa)
  const duracionMs = fin.getTime() - inicio.getTime() + 1;
  const finAnterior = new Date(inicio.getTime() - 1);
  const inicioAnterior = new Date(finAnterior.getTime() - duracionMs + 1);

  return {
    tipoPeriodo,
    etiquetaPeriodo,
    fechaInicio: formatearFechaYYYYMMDD(aFechaLocalArgentina(inicio)),
    fechaFin: formatearFechaYYYYMMDD(aFechaLocalArgentina(fin)),
    inicio,
    fin,
    inicioAnterior,
    finAnterior,
  };
}

/**
 * Clasifica un turno dentro de las categorías analíticas del centro de salud:
 * - REALIZADO: Estado COMPLETADO o tiene consulta médica registrada.
 * - AUSENTE:
 *     1) Estado explícito 'AUSENTE' (si se extiende el enum), o
 *     2) Estado CANCELADO cuyo motivo indica explícitamente ausentismo/inasistencia, o
 *     3) Turno en estado SOLICITADO o CONFIRMADO cuya fechaHora ya pasó (fechaHora < ahora)
 *        y no registra consulta médica (paciente no asistió).
 * - CANCELADO: Estado CANCELADO (por paciente o por centro/administración).
 * - REPROGRAMADO: Estado REPROGRAMADO.
 * - PENDIENTE: Estado SOLICITADO o CONFIRMADO con fechaHora futura.
 */
export function clasificarTurnoParaMetrica(
  turno: {
    estado: string;
    fechaHora: Date;
    motivoCancelacion?: string | null;
    consulta?: { idConsulta: number } | null;
  },
  ahora: Date = new Date()
): CategoriaEstadoMetrica {
  const estadoUpper = String(turno.estado).toUpperCase();

  if (estadoUpper === 'COMPLETADO' || turno.consulta) {
    return 'REALIZADO';
  }

  if (estadoUpper === 'AUSENTE') {
    return 'AUSENTE';
  }

  if (estadoUpper === 'REPROGRAMADO') {
    return 'REPROGRAMADO';
  }

  if (estadoUpper === 'CANCELADO') {
    const motivo = (turno.motivoCancelacion || '').toLowerCase();
    if (motivo.includes('ausent') || motivo.includes('inasist') || motivo.includes('no asist')) {
      return 'AUSENTE';
    }
    return 'CANCELADO';
  }

  // SOLICITADO o CONFIRMADO: si ya pasó la hora del turno y no fue atendido ni cancelado -> AUSENTE
  if (turno.fechaHora.getTime() < ahora.getTime()) {
    return 'AUSENTE';
  }

  return 'PENDIENTE';
}

function calcularVariacionPorcentual(actual: number, anterior: number): number | null {
  if (anterior === 0) {
    return actual > 0 ? 100 : 0;
  }
  return redondear(((actual - anterior) / anterior) * 100, 2);
}

/**
 * Calcula la cantidad total de slots (turnos disponibles por agenda configurada)
 * para los profesionales activos en el rango de fechas [inicio, fin].
 */
async function calcularCapacidadAgendaEnPeriodo(
  inicio: Date,
  fin: Date,
  idProfesional?: number,
  idEspecialidad?: number
): Promise<{
  slotsDisponiblesTotales: number;
  profesionalesConAgenda: number;
  slotsPorDiaSemana: Record<number, number>;
}> {
  const whereAgenda: Prisma.AgendaProfesionalWhereInput = {
    estado: 'ACTIVO',
    profesional: {
      estado: 'ACTIVO',
      ...(idProfesional ? { idProfesional } : {}),
      ...(idEspecialidad
        ? {
            especialidades: {
              some: {
                idEspecialidad,
                estado: 'ACTIVO',
              },
            },
          }
        : {}),
    },
  };

  const agendasActivas = await prisma.agendaProfesional.findMany({
    where: whereAgenda,
  });

  // Calcular cuántos slots aporta cada franja en su respectivo diaSemana
  const slotsBasePorDiaSemana: Record<number, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  };
  const setProfesionales = new Set<number>();

  for (const franja of agendasActivas) {
    setProfesionales.add(franja.idProfesional);
    const [hIni, mIni] = franja.horaInicio.split(':').map(Number);
    const [hFin, mFin] = franja.horaFin.split(':').map(Number);
    const minInicio = hIni * 60 + mIni;
    const minFin = hFin * 60 + mFin;
    const duracion = franja.duracionTurnoMinutos > 0 ? franja.duracionTurnoMinutos : 30;
    if (minFin > minInicio) {
      const cantidadSlotsFranja = Math.floor((minFin - minInicio) / duracion);
      slotsBasePorDiaSemana[franja.diaSemana] =
        (slotsBasePorDiaSemana[franja.diaSemana] || 0) + cantidadSlotsFranja;
    }
  }

  // Recorrer cada día calendario del período en hora de Argentina
  const slotsPorDiaSemana: Record<number, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  };
  let slotsDisponiblesTotales = 0;

  const cursor = new Date(aFechaLocalArgentina(inicio));
  cursor.setUTCHours(0, 0, 0, 0);
  const limiteFin = new Date(aFechaLocalArgentina(fin));
  limiteFin.setUTCHours(0, 0, 0, 0);

  while (cursor.getTime() <= limiteFin.getTime()) {
    const diaSemana = cursor.getUTCDay();
    const slotsDelDia = slotsBasePorDiaSemana[diaSemana] || 0;
    slotsDisponiblesTotales += slotsDelDia;
    slotsPorDiaSemana[diaSemana] += slotsDelDia;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    slotsDisponiblesTotales,
    profesionalesConAgenda: setProfesionales.size,
    slotsPorDiaSemana,
  };
}

/**
 * HU18: Obtiene el panel completo de métricas, indicadores comparativos y gráficos estadísticos.
 */
export async function obtenerPanelMetricas(filtros: FiltrosMetricas = {}) {
  const rango = resolverRangoPeriodo(filtros);
  const ahora = new Date();

  const whereBaseProfesional: Prisma.ProfesionalWhereInput = {
    ...(filtros.idProfesional ? { idProfesional: filtros.idProfesional } : {}),
    ...(filtros.idEspecialidad
      ? {
          especialidades: {
            some: {
              idEspecialidad: filtros.idEspecialidad,
              estado: 'ACTIVO',
            },
          },
        }
      : {}),
  };

  const wherePeriodoActual: Prisma.TurnoWhereInput = {
    fechaHora: {
      gte: rango.inicio,
      lte: rango.fin,
    },
    ...(filtros.idProfesional ? { idProfesional: filtros.idProfesional } : {}),
    ...(filtros.idEspecialidad
      ? {
          profesional: whereBaseProfesional,
        }
      : {}),
  };

  const wherePeriodoAnterior: Prisma.TurnoWhereInput = {
    fechaHora: {
      gte: rango.inicioAnterior,
      lte: rango.finAnterior,
    },
    ...(filtros.idProfesional ? { idProfesional: filtros.idProfesional } : {}),
    ...(filtros.idEspecialidad
      ? {
          profesional: whereBaseProfesional,
        }
      : {}),
  };

  const [turnosActuales, turnosAnteriores, capacidadAgenda] = await Promise.all([
    prisma.turno.findMany({
      where: wherePeriodoActual,
      include: {
        consulta: {
          select: {
            idConsulta: true,
            fechaRealizacion: true,
          },
        },
        paciente: {
          select: {
            idPaciente: true,
            fechaRegistro: true,
            usuario: {
              select: {
                dni: true,
                nombre: true,
                apellido: true,
              },
            },
            plan: {
              select: {
                idPlan: true,
                nombre: true,
                obraSocial: {
                  select: {
                    idObraSocial: true,
                    nombre: true,
                  },
                },
              },
            },
          },
        },
        profesional: {
          select: {
            idProfesional: true,
            matricula: true,
            usuario: {
              select: {
                nombre: true,
                apellido: true,
              },
            },
            especialidades: {
              where: { estado: 'ACTIVO' },
              select: {
                especialidad: {
                  select: {
                    idEspecialidad: true,
                    nombre: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { fechaHora: 'asc' },
    }),
    prisma.turno.findMany({
      where: wherePeriodoAnterior,
      select: {
        idTurno: true,
        estado: true,
        fechaHora: true,
        motivoCancelacion: true,
        consulta: { select: { idConsulta: true } },
      },
    }),
    calcularCapacidadAgendaEnPeriodo(
      rango.inicio,
      rango.fin,
      filtros.idProfesional,
      filtros.idEspecialidad
    ),
  ]);

  const totalTurnos = turnosActuales.length;

  // Escenario 4: Período sin datos
  if (totalTurnos === 0) {
    const diasSemanaVacios = [1, 2, 3, 4, 5, 6, 0].map((dia) => ({
      diaSemana: dia,
      nombreDia: NOMBRES_DIAS_SEMANA[dia],
      realizados: 0,
      cancelados: 0,
      ausentes: 0,
      reprogramados: 0,
      pendientes: 0,
      total: 0,
    }));

    return {
      sinDatos: true,
      mensaje: 'No hay datos para el período seleccionado',
      totalTurnos: 0,
      porcentajeAusentismo: 0,
      porcentajeCancelaciones: 0,
      especialidadMasDemandada: null,
      periodo: {
        tipo: rango.tipoPeriodo,
        etiqueta: rango.etiquetaPeriodo,
        fechaInicio: rango.fechaInicio,
        fechaFin: rango.fechaFin,
        filtrosAplicados: {
          idEspecialidad: filtros.idEspecialidad || null,
          idProfesional: filtros.idProfesional || null,
        },
      },
      indicadoresPrincipales: {
        totalTurnos: 0,
        porcentajeAusentismo: 0,
        cantidadAusentes: 0,
        porcentajeCancelaciones: 0,
        cantidadCancelados: 0,
        especialidadMasDemandada: null,
        tasaEfectividadAtencion: {
          cantidadRealizados: 0,
          porcentajeEfectividad: 0,
        },
        tasaReprogramacion: {
          cantidadReprogramados: 0,
          porcentajeReprogramados: 0,
        },
        turnosPendientes: 0,
        comparativaPeriodoAnterior: {
          totalTurnosAnterior: turnosAnteriores.length,
          variacionTotalTurnosPct: calcularVariacionPorcentual(0, turnosAnteriores.length),
          variacionAusentismoPuntos: 0,
          variacionCancelacionesPuntos: 0,
          variacionEfectividadPuntos: 0,
        },
      },
      metricasCapacidadOcupacion: {
        slotsDisponiblesTotales: capacidadAgenda.slotsDisponiblesTotales,
        profesionalesConAgendaActiva: capacidadAgenda.profesionalesConAgenda,
        turnosOcupados: 0,
        tasaOcupacionAgendaPct: 0,
        capacidadOciosaSlots: capacidadAgenda.slotsDisponiblesTotales,
        turnosPerdidosPorInasistenciaOCancelacion: 0,
      },
      cancelacionesDetalle: {
        totalCancelados: 0,
        antelacionPromedioHoras: null,
        antelacionPromedioDias: null,
        cancelacionesMenosDe24hs: { cantidad: 0, porcentaje: 0 },
        origenCancelacion: {
          paciente: { cantidad: 0, porcentaje: 0 },
          administracionCentro: { cantidad: 0, porcentaje: 0 },
        },
      },
      ausentismoDetalle: {
        totalAusentes: 0,
        porFranjaHoraria: [
          { franja: 'Mañana (06:00 - 11:59)', totalTurnos: 0, ausentes: 0, porcentajeAusentismo: 0 },
          { franja: 'Tarde (12:00 - 17:59)', totalTurnos: 0, ausentes: 0, porcentajeAusentismo: 0 },
          { franja: 'Noche (18:00 - 23:59)', totalTurnos: 0, ausentes: 0, porcentajeAusentismo: 0 },
        ],
        pacientesRecurrentesAusentismo: {
          cantidadPacientesReincidentes: 0,
          totalAusenciasReincidentes: 0,
          pacientes: [],
        },
      },
      tiemposAccesibilidad: {
        leadTimePromedioDias: null,
        leadTimePromedioHoras: null,
      },
      metricasPacientes: {
        pacientesUnicosAtendidosOAgendados: 0,
        pacientesNuevos: { cantidad: 0, porcentaje: 0 },
        pacientesRecurrentes: { cantidad: 0, porcentaje: 0 },
        distribucionPorCobertura: [],
      },
      rendimientoPorProfesional: [],
      graficos: {
        distribucionPorEspecialidad: [],
        evolucionPorDiaSemana: diasSemanaVacios,
        evolucionTemporalDiaria: [],
        mapaCalorDiaFranja: [],
        distribucionPorEstado: [],
      },
    };
  }

  // ---- 1. Clasificación de turnos del período actual y del período anterior ----
  let cantidadRealizados = 0;
  let cantidadCancelados = 0;
  let cantidadAusentes = 0;
  let cantidadReprogramados = 0;
  let cantidadPendientes = 0;

  const idsTurnosActuales = turnosActuales.map((t) => t.idTurno);
  const idsTurnosCancelados: number[] = [];

  // Mapas para agregaciones
  const mapaEspecialidades = new Map<
    number,
    {
      idEspecialidad: number;
      especialidad: string;
      totalTurnos: number;
      realizados: number;
      cancelados: number;
      ausentes: number;
      reprogramados: number;
      pendientes: number;
    }
  >();

  const mapaDiaSemana: Record<
    number,
    {
      diaSemana: number;
      nombreDia: string;
      realizados: number;
      cancelados: number;
      ausentes: number;
      reprogramados: number;
      pendientes: number;
      total: number;
    }
  > = {};

  for (const d of [1, 2, 3, 4, 5, 6, 0]) {
    mapaDiaSemana[d] = {
      diaSemana: d,
      nombreDia: NOMBRES_DIAS_SEMANA[d],
      realizados: 0,
      cancelados: 0,
      ausentes: 0,
      reprogramados: 0,
      pendientes: 0,
      total: 0,
    };
  }

  const mapaEvolucionDiaria = new Map<
    string,
    {
      fecha: string;
      realizados: number;
      cancelados: number;
      ausentes: number;
      reprogramados: number;
      pendientes: number;
      total: number;
    }
  >();

  const franjasHorarias: Record<
    'MANANA' | 'TARDE' | 'NOCHE',
    { franja: string; totalTurnos: number; ausentes: number; cancelados: number; realizados: number }
  > = {
    MANANA: { franja: 'Mañana (06:00 - 11:59)', totalTurnos: 0, ausentes: 0, cancelados: 0, realizados: 0 },
    TARDE: { franja: 'Tarde (12:00 - 17:59)', totalTurnos: 0, ausentes: 0, cancelados: 0, realizados: 0 },
    NOCHE: { franja: 'Noche (18:00 - 23:59)', totalTurnos: 0, ausentes: 0, cancelados: 0, realizados: 0 },
  };

  const mapaHeatmap = new Map<
    string,
    { diaSemana: number; nombreDia: string; franja: string; hora: string; cantidadTurnos: number }
  >();

  const mapaAusenciasPorPaciente = new Map<
    number,
    { idPaciente: number; dni: string; nombreCompleto: string; cantidadAusencias: number }
  >();

  const mapaPacientesUnicos = new Map<
    number,
    { idPaciente: number; fechaRegistro: Date; primerTurnoEnPeriodo: Date }
  >();

  const mapaCobertura = new Map<string, { cobertura: string; cantidadTurnos: number }>();

  const mapaProfesionales = new Map<
    number,
    {
      idProfesional: number;
      nombreCompleto: string;
      matricula: string;
      especialidades: string[];
      totalTurnos: number;
      realizados: number;
      cancelados: number;
      ausentes: number;
      reprogramados: number;
      pendientes: number;
    }
  >();

  let canceladosPorPaciente = 0;
  let canceladosPorAdminCentro = 0;

  for (const turno of turnosActuales) {
    const categoria = clasificarTurnoParaMetrica(turno, ahora);

    if (categoria === 'REALIZADO') cantidadRealizados++;
    else if (categoria === 'CANCELADO') {
      cantidadCancelados++;
      idsTurnosCancelados.push(turno.idTurno);
      const motivo = (turno.motivoCancelacion || '').toLowerCase();
      if (motivo.includes('paciente')) {
        canceladosPorPaciente++;
      } else {
        canceladosPorAdminCentro++;
      }
    } else if (categoria === 'AUSENTE') {
      cantidadAusentes++;
      const pacExistente = mapaAusenciasPorPaciente.get(turno.idPaciente);
      if (pacExistente) {
        pacExistente.cantidadAusencias++;
      } else {
        mapaAusenciasPorPaciente.set(turno.idPaciente, {
          idPaciente: turno.idPaciente,
          dni: turno.paciente.usuario.dni,
          nombreCompleto: `${turno.paciente.usuario.nombre} ${turno.paciente.usuario.apellido}`,
          cantidadAusencias: 1,
        });
      }
    } else if (categoria === 'REPROGRAMADO') {
      cantidadReprogramados++;
    } else {
      cantidadPendientes++;
    }

    // Día y hora en Argentina (UTC-3)
    const fechaArg = aFechaLocalArgentina(turno.fechaHora);
    const diaSemana = fechaArg.getUTCDay();
    const hora = fechaArg.getUTCHours();
    const fechaStr = formatearFechaYYYYMMDD(fechaArg);

    // Evolución por día de la semana (Escenario 2)
    const registroDiaSem = mapaDiaSemana[diaSemana];
    registroDiaSem.total++;
    if (categoria === 'REALIZADO') registroDiaSem.realizados++;
    else if (categoria === 'CANCELADO') registroDiaSem.cancelados++;
    else if (categoria === 'AUSENTE') registroDiaSem.ausentes++;
    else if (categoria === 'REPROGRAMADO') registroDiaSem.reprogramados++;
    else registroDiaSem.pendientes++;

    // Evolución temporal diaria
    let registroFecha = mapaEvolucionDiaria.get(fechaStr);
    if (!registroFecha) {
      registroFecha = {
        fecha: fechaStr,
        realizados: 0,
        cancelados: 0,
        ausentes: 0,
        reprogramados: 0,
        pendientes: 0,
        total: 0,
      };
      mapaEvolucionDiaria.set(fechaStr, registroFecha);
    }
    registroFecha.total++;
    if (categoria === 'REALIZADO') registroFecha.realizados++;
    else if (categoria === 'CANCELADO') registroFecha.cancelados++;
    else if (categoria === 'AUSENTE') registroFecha.ausentes++;
    else if (categoria === 'REPROGRAMADO') registroFecha.reprogramados++;
    else registroFecha.pendientes++;

    // Franja horaria
    const claveFranja: 'MANANA' | 'TARDE' | 'NOCHE' =
      hora < 12 ? 'MANANA' : hora < 18 ? 'TARDE' : 'NOCHE';
    franjasHorarias[claveFranja].totalTurnos++;
    if (categoria === 'AUSENTE') franjasHorarias[claveFranja].ausentes++;
    if (categoria === 'CANCELADO') franjasHorarias[claveFranja].cancelados++;
    if (categoria === 'REALIZADO') franjasHorarias[claveFranja].realizados++;

    // Mapa de calor Día x Hora
    const horaBloque = `${String(hora).padStart(2, '0')}:00`;
    const claveHeat = `${diaSemana}-${horaBloque}`;
    const itemHeat = mapaHeatmap.get(claveHeat);
    if (itemHeat) {
      itemHeat.cantidadTurnos++;
    } else {
      mapaHeatmap.set(claveHeat, {
        diaSemana,
        nombreDia: NOMBRES_DIAS_SEMANA[diaSemana],
        franja: franjasHorarias[claveFranja].franja,
        hora: horaBloque,
        cantidadTurnos: 1,
      });
    }

    // Distribución por especialidad
    const especialidadesProf =
      turno.profesional.especialidades.length > 0
        ? turno.profesional.especialidades.map((e) => e.especialidad)
        : [{ idEspecialidad: 0, nombre: 'Sin especialidad asignada' }];

    // Si se filtró por una especialidad específica, contabilizar solo para esa especialidad
    const especialidadesAContabilizar = filtros.idEspecialidad
      ? especialidadesProf.filter((e) => e.idEspecialidad === filtros.idEspecialidad)
      : especialidadesProf;

    for (const esp of especialidadesAContabilizar) {
      let regEsp = mapaEspecialidades.get(esp.idEspecialidad);
      if (!regEsp) {
        regEsp = {
          idEspecialidad: esp.idEspecialidad,
          especialidad: esp.nombre,
          totalTurnos: 0,
          realizados: 0,
          cancelados: 0,
          ausentes: 0,
          reprogramados: 0,
          pendientes: 0,
        };
        mapaEspecialidades.set(esp.idEspecialidad, regEsp);
      }
      regEsp.totalTurnos++;
      if (categoria === 'REALIZADO') regEsp.realizados++;
      else if (categoria === 'CANCELADO') regEsp.cancelados++;
      else if (categoria === 'AUSENTE') regEsp.ausentes++;
      else if (categoria === 'REPROGRAMADO') regEsp.reprogramados++;
      else regEsp.pendientes++;
    }

    // Pacientes únicos y cobertura
    const pacUnico = mapaPacientesUnicos.get(turno.idPaciente);
    if (!pacUnico || turno.fechaHora < pacUnico.primerTurnoEnPeriodo) {
      mapaPacientesUnicos.set(turno.idPaciente, {
        idPaciente: turno.idPaciente,
        fechaRegistro: turno.paciente.fechaRegistro,
        primerTurnoEnPeriodo: turno.fechaHora,
      });
    }

    const nombreCobertura = turno.paciente.plan?.obraSocial?.nombre || 'Particular';
    const regCob = mapaCobertura.get(nombreCobertura);
    if (regCob) {
      regCob.cantidadTurnos++;
    } else {
      mapaCobertura.set(nombreCobertura, {
        cobertura: nombreCobertura,
        cantidadTurnos: 1,
      });
    }

    // Rendimiento por profesional
    let regProf = mapaProfesionales.get(turno.idProfesional);
    if (!regProf) {
      regProf = {
        idProfesional: turno.idProfesional,
        nombreCompleto: `${turno.profesional.usuario.nombre} ${turno.profesional.usuario.apellido}`,
        matricula: turno.profesional.matricula,
        especialidades: especialidadesProf.map((e) => e.nombre),
        totalTurnos: 0,
        realizados: 0,
        cancelados: 0,
        ausentes: 0,
        reprogramados: 0,
        pendientes: 0,
      };
      mapaProfesionales.set(turno.idProfesional, regProf);
    }
    regProf.totalTurnos++;
    if (categoria === 'REALIZADO') regProf.realizados++;
    else if (categoria === 'CANCELADO') regProf.cancelados++;
    else if (categoria === 'AUSENTE') regProf.ausentes++;
    else if (categoria === 'REPROGRAMADO') regProf.reprogramados++;
    else regProf.pendientes++;
  }

  // ---- 2. Cálculo de porcentajes principales y comparativa con el período anterior ----
  const porcentajeAusentismo = redondear((cantidadAusentes / totalTurnos) * 100, 2);
  const porcentajeCancelaciones = redondear((cantidadCancelados / totalTurnos) * 100, 2);
  const porcentajeEfectividad = redondear((cantidadRealizados / totalTurnos) * 100, 2);
  const porcentajeReprogramados = redondear((cantidadReprogramados / totalTurnos) * 100, 2);

  // Período anterior
  let antRealizados = 0;
  let antCancelados = 0;
  let antAusentes = 0;
  for (const tAnt of turnosAnteriores) {
    const catAnt = clasificarTurnoParaMetrica(tAnt, ahora);
    if (catAnt === 'REALIZADO') antRealizados++;
    else if (catAnt === 'CANCELADO') antCancelados++;
    else if (catAnt === 'AUSENTE') antAusentes++;
  }
  const totalAnterior = turnosAnteriores.length;
  const pctAusentismoAnterior =
    totalAnterior > 0 ? redondear((antAusentes / totalAnterior) * 100, 2) : 0;
  const pctCancelacionesAnterior =
    totalAnterior > 0 ? redondear((antCancelados / totalAnterior) * 100, 2) : 0;
  const pctEfectividadAnterior =
    totalAnterior > 0 ? redondear((antRealizados / totalAnterior) * 100, 2) : 0;

  // ---- 3. Especialidad más demandada y distribución por especialidad ----
  const distribucionPorEspecialidad = Array.from(mapaEspecialidades.values())
    .sort((a, b) => b.totalTurnos - a.totalTurnos)
    .map((item) => ({
      ...item,
      porcentajeSobreTotal: redondear((item.totalTurnos / totalTurnos) * 100, 2),
      tasaAusentismoEspecialidadPct:
        item.totalTurnos > 0 ? redondear((item.ausentes / item.totalTurnos) * 100, 2) : 0,
      tasaCancelacionEspecialidadPct:
        item.totalTurnos > 0 ? redondear((item.cancelados / item.totalTurnos) * 100, 2) : 0,
      tasaEfectividadEspecialidadPct:
        item.totalTurnos > 0 ? redondear((item.realizados / item.totalTurnos) * 100, 2) : 0,
    }));

  const especialidadMasDemandada =
    distribucionPorEspecialidad.length > 0
      ? {
          idEspecialidad: distribucionPorEspecialidad[0].idEspecialidad,
          nombre: distribucionPorEspecialidad[0].especialidad,
          cantidadTurnos: distribucionPorEspecialidad[0].totalTurnos,
          porcentajeSobreTotal: distribucionPorEspecialidad[0].porcentajeSobreTotal,
        }
      : null;

  // ---- 4. Antelación de cancelación y Lead Time desde Auditoría ----
  let antelacionPromedioHoras: number | null = null;
  let antelacionPromedioDias: number | null = null;
  let cancelacionesMenosDe24hs = 0;
  let leadTimePromedioHoras: number | null = null;
  let leadTimePromedioDias: number | null = null;

  const auditoriasTurnos = await prisma.auditoria.findMany({
    where: {
      tablaAfectada: 'turno',
      idRegistroAfectado: { in: idsTurnosActuales },
    },
    orderBy: { fechaHora: 'desc' },
  });

  const mapaFechaCancelacion = new Map<number, { fechaCancelacion: Date; accion: string }>();
  const mapaFechaCreacionTurno = new Map<number, Date>();

  for (const aud of auditoriasTurnos) {
    if (!aud.idRegistroAfectado) continue;
    if (
      (aud.accion === 'CANCELAR_TURNO' || aud.accion === 'CANCELAR_TURNO_ADMIN') &&
      !mapaFechaCancelacion.has(aud.idRegistroAfectado)
    ) {
      mapaFechaCancelacion.set(aud.idRegistroAfectado, {
        fechaCancelacion: aud.fechaHora,
        accion: aud.accion,
      });
    }
    if (
      (aud.accion.includes('CREAR') || aud.accion.includes('REPROGRAMAR')) &&
      !mapaFechaCreacionTurno.has(aud.idRegistroAfectado)
    ) {
      mapaFechaCreacionTurno.set(aud.idRegistroAfectado, aud.fechaHora);
    }
  }

  if (idsTurnosCancelados.length > 0) {
    const diferenciasCancelacionHoras: number[] = [];
    for (const turno of turnosActuales) {
      if (!idsTurnosCancelados.includes(turno.idTurno)) continue;
      const infoCanc = mapaFechaCancelacion.get(turno.idTurno);
      if (infoCanc) {
        const diffHoras = Math.max(
          0,
          (turno.fechaHora.getTime() - infoCanc.fechaCancelacion.getTime()) / (1000 * 60 * 60)
        );
        diferenciasCancelacionHoras.push(diffHoras);
        if (diffHoras < 24) {
          cancelacionesMenosDe24hs++;
        }
      }
    }
    if (diferenciasCancelacionHoras.length > 0) {
      const sumaHoras = diferenciasCancelacionHoras.reduce((acc, v) => acc + v, 0);
      antelacionPromedioHoras = redondear(sumaHoras / diferenciasCancelacionHoras.length, 2);
      antelacionPromedioDias = redondear(antelacionPromedioHoras / 24, 2);
    }
  }

  // Lead Time (Tiempo de anticipación entre solicitud/registro y fecha del turno)
  const diferenciasLeadTimeHoras: number[] = [];
  for (const turno of turnosActuales) {
    const fechaSolicitud =
      mapaFechaCreacionTurno.get(turno.idTurno) || turno.paciente.fechaRegistro;
    if (fechaSolicitud && turno.fechaHora.getTime() >= fechaSolicitud.getTime()) {
      const diffHoras =
        (turno.fechaHora.getTime() - fechaSolicitud.getTime()) / (1000 * 60 * 60);
      diferenciasLeadTimeHoras.push(diffHoras);
    }
  }
  if (diferenciasLeadTimeHoras.length > 0) {
    const sumaLeadHoras = diferenciasLeadTimeHoras.reduce((acc, v) => acc + v, 0);
    leadTimePromedioHoras = redondear(sumaLeadHoras / diferenciasLeadTimeHoras.length, 2);
    leadTimePromedioDias = redondear(leadTimePromedioHoras / 24, 2);
  }

  // ---- 5. Pacientes Nuevos vs. Recurrentes ----
  const idsPacientesUnicos = Array.from(mapaPacientesUnicos.keys());
  const turnosPreviosPorPaciente = await prisma.turno.groupBy({
    by: ['idPaciente'],
    where: {
      idPaciente: { in: idsPacientesUnicos },
      fechaHora: { lt: rango.inicio },
    },
    _count: { idTurno: true },
  });
  const setPacientesConTurnosPrevios = new Set(turnosPreviosPorPaciente.map((p) => p.idPaciente));

  let cantidadPacientesNuevos = 0;
  let cantidadPacientesRecurrentes = 0;
  for (const idPac of idsPacientesUnicos) {
    if (setPacientesConTurnosPrevios.has(idPac)) {
      cantidadPacientesRecurrentes++;
    } else {
      cantidadPacientesNuevos++;
    }
  }
  const totalPacientesUnicos = idsPacientesUnicos.length;

  // ---- 6. Ocupación de agenda y capacidad ociosa ----
  const turnosQueOcupanSlot = cantidadRealizados + cantidadPendientes + cantidadAusentes;
  const tasaOcupacionAgendaPct =
    capacidadAgenda.slotsDisponiblesTotales > 0
      ? redondear(
          Math.min(100, (turnosQueOcupanSlot / capacidadAgenda.slotsDisponiblesTotales) * 100),
          2
        )
      : 0;
  const capacidadOciosaSlots = Math.max(
    0,
    capacidadAgenda.slotsDisponiblesTotales - (cantidadRealizados + cantidadPendientes)
  );

  // ---- 7. Pacientes con ausentismo recurrente (>= 2 inasistencias) ----
  const pacientesReincidentes = Array.from(mapaAusenciasPorPaciente.values())
    .filter((p) => p.cantidadAusencias >= 2)
    .sort((a, b) => b.cantidadAusencias - a.cantidadAusencias);

  const totalAusenciasReincidentes = pacientesReincidentes.reduce(
    (acc, p) => acc + p.cantidadAusencias,
    0
  );

  // ---- 8. Rendimiento por profesional ----
  const rendimientoPorProfesional = Array.from(mapaProfesionales.values())
    .sort((a, b) => b.totalTurnos - a.totalTurnos)
    .map((prof) => ({
      ...prof,
      tasaEfectividadPct:
        prof.totalTurnos > 0 ? redondear((prof.realizados / prof.totalTurnos) * 100, 2) : 0,
      tasaAusentismoPct:
        prof.totalTurnos > 0 ? redondear((prof.ausentes / prof.totalTurnos) * 100, 2) : 0,
      tasaCancelacionPct:
        prof.totalTurnos > 0 ? redondear((prof.cancelados / prof.totalTurnos) * 100, 2) : 0,
    }));

  // ---- 9. Evolución por día de la semana (Lunes a Domingo) ----
  const ordenDias = [1, 2, 3, 4, 5, 6, 0];
  const evolucionPorDiaSemana = ordenDias.map((d) => mapaDiaSemana[d]);

  return {
    sinDatos: false,
    mensaje: 'Métricas calculadas correctamente.',
    totalTurnos,
    porcentajeAusentismo,
    porcentajeCancelaciones,
    especialidadMasDemandada,
    periodo: {
      tipo: rango.tipoPeriodo,
      etiqueta: rango.etiquetaPeriodo,
      fechaInicio: rango.fechaInicio,
      fechaFin: rango.fechaFin,
      filtrosAplicados: {
        idEspecialidad: filtros.idEspecialidad || null,
        idProfesional: filtros.idProfesional || null,
      },
    },
    indicadoresPrincipales: {
      totalTurnos,
      porcentajeAusentismo,
      cantidadAusentes,
      porcentajeCancelaciones,
      cantidadCancelados,
      especialidadMasDemandada,
      tasaEfectividadAtencion: {
        cantidadRealizados,
        porcentajeEfectividad,
      },
      tasaReprogramacion: {
        cantidadReprogramados,
        porcentajeReprogramados,
      },
      turnosPendientes: cantidadPendientes,
      comparativaPeriodoAnterior: {
        totalTurnosAnterior: totalAnterior,
        variacionTotalTurnosPct: calcularVariacionPorcentual(totalTurnos, totalAnterior),
        porcentajeAusentismoAnterior: pctAusentismoAnterior,
        variacionAusentismoPuntos: redondear(porcentajeAusentismo - pctAusentismoAnterior, 2),
        porcentajeCancelacionesAnterior: pctCancelacionesAnterior,
        variacionCancelacionesPuntos: redondear(
          porcentajeCancelaciones - pctCancelacionesAnterior,
          2
        ),
        porcentajeEfectividadAnterior: pctEfectividadAnterior,
        variacionEfectividadPuntos: redondear(porcentajeEfectividad - pctEfectividadAnterior, 2),
      },
    },
    metricasCapacidadOcupacion: {
      slotsDisponiblesTotales: capacidadAgenda.slotsDisponiblesTotales,
      profesionalesConAgendaActiva: capacidadAgenda.profesionalesConAgenda,
      turnosOcupados: turnosQueOcupanSlot,
      tasaOcupacionAgendaPct,
      capacidadOciosaSlots,
      turnosPerdidosPorInasistenciaOCancelacion: cantidadAusentes + cantidadCancelados,
    },
    cancelacionesDetalle: {
      totalCancelados: cantidadCancelados,
      antelacionPromedioHoras,
      antelacionPromedioDias,
      cancelacionesMenosDe24hs: {
        cantidad: cancelacionesMenosDe24hs,
        porcentaje:
          cantidadCancelados > 0
            ? redondear((cancelacionesMenosDe24hs / cantidadCancelados) * 100, 2)
            : 0,
      },
      origenCancelacion: {
        paciente: {
          cantidad: canceladosPorPaciente,
          porcentaje:
            cantidadCancelados > 0
              ? redondear((canceladosPorPaciente / cantidadCancelados) * 100, 2)
              : 0,
        },
        administracionCentro: {
          cantidad: canceladosPorAdminCentro,
          porcentaje:
            cantidadCancelados > 0
              ? redondear((canceladosPorAdminCentro / cantidadCancelados) * 100, 2)
              : 0,
        },
      },
    },
    ausentismoDetalle: {
      totalAusentes: cantidadAusentes,
      porFranjaHoraria: Object.values(franjasHorarias).map((f) => ({
        ...f,
        porcentajeAusentismo:
          f.totalTurnos > 0 ? redondear((f.ausentes / f.totalTurnos) * 100, 2) : 0,
      })),
      pacientesRecurrentesAusentismo: {
        cantidadPacientesReincidentes: pacientesReincidentes.length,
        totalAusenciasReincidentes,
        pacientes: pacientesReincidentes.slice(0, 20),
      },
    },
    tiemposAccesibilidad: {
      leadTimePromedioDias,
      leadTimePromedioHoras,
    },
    metricasPacientes: {
      pacientesUnicosAtendidosOAgendados: totalPacientesUnicos,
      pacientesNuevos: {
        cantidad: cantidadPacientesNuevos,
        porcentaje:
          totalPacientesUnicos > 0
            ? redondear((cantidadPacientesNuevos / totalPacientesUnicos) * 100, 2)
            : 0,
      },
      pacientesRecurrentes: {
        cantidad: cantidadPacientesRecurrentes,
        porcentaje:
          totalPacientesUnicos > 0
            ? redondear((cantidadPacientesRecurrentes / totalPacientesUnicos) * 100, 2)
            : 0,
      },
      distribucionPorCobertura: Array.from(mapaCobertura.values())
        .sort((a, b) => b.cantidadTurnos - a.cantidadTurnos)
        .map((c) => ({
          cobertura: c.cobertura,
          cantidadTurnos: c.cantidadTurnos,
          porcentaje: redondear((c.cantidadTurnos / totalTurnos) * 100, 2),
        })),
    },
    rendimientoPorProfesional,
    graficos: {
      distribucionPorEspecialidad,
      evolucionPorDiaSemana,
      evolucionTemporalDiaria: Array.from(mapaEvolucionDiaria.values()).sort((a, b) =>
        a.fecha.localeCompare(b.fecha)
      ),
      mapaCalorDiaFranja: Array.from(mapaHeatmap.values()).sort((a, b) =>
        a.diaSemana !== b.diaSemana ? a.diaSemana - b.diaSemana : a.hora.localeCompare(b.hora)
      ),
      distribucionPorEstado: [
        {
          estado: 'REALIZADO',
          cantidad: cantidadRealizados,
          porcentaje: porcentajeEfectividad,
        },
        {
          estado: 'CANCELADO',
          cantidad: cantidadCancelados,
          porcentaje: porcentajeCancelaciones,
        },
        {
          estado: 'AUSENTE',
          cantidad: cantidadAusentes,
          porcentaje: porcentajeAusentismo,
        },
        {
          estado: 'REPROGRAMADO',
          cantidad: cantidadReprogramados,
          porcentaje: porcentajeReprogramados,
        },
        {
          estado: 'PENDIENTE',
          cantidad: cantidadPendientes,
          porcentaje: redondear((cantidadPendientes / totalTurnos) * 100, 2),
        },
      ],
    },
  };
}

/**
 * Escenario 5: Genera y almacena un reporte de métricas (manual o automático programado)
 * dejándolo disponible para consulta en el sistema y registrando el evento en el log de auditoría.
 */
export async function generarYGuardarReporte(
  filtros: FiltrosMetricas,
  opciones: {
    idUsuario?: number;
    ip?: string;
    esAutomatico?: boolean;
  } = {}
) {
  const metricas = await obtenerPanelMetricas(filtros);
  const fechaGeneracion = new Date();
  const accionAuditoria = opciones.esAutomatico
    ? 'GENERAR_REPORTE_AUTOMATICO'
    : 'GENERAR_REPORTE_METRICAS';

  const descripcion = opciones.esAutomatico
    ? `Generación automática programada del reporte mensual (${metricas.periodo.fechaInicio} a ${metricas.periodo.fechaFin}).`
    : `Generación de reporte de métricas para el período ${metricas.periodo.fechaInicio} a ${metricas.periodo.fechaFin}.`;

  const registroAuditoria = await prisma.auditoria.create({
    data: {
      idUsuario: opciones.idUsuario ?? null,
      fechaHora: fechaGeneracion,
      accion: accionAuditoria,
      tablaAfectada: 'reporte_metricas',
      datosNuevos: JSON.stringify({
        tipoGeneracion: opciones.esAutomatico ? 'AUTOMATICO' : 'MANUAL',
        fechaGeneracion: fechaGeneracion.toISOString(),
        metricas,
      }),
      ip: opciones.ip,
      descripcion,
    },
  });

  return {
    idReporte: registroAuditoria.idAuditoria,
    tipoGeneracion: opciones.esAutomatico ? 'AUTOMATICO' : 'MANUAL',
    fechaGeneracion: registroAuditoria.fechaHora,
    descripcion: registroAuditoria.descripcion,
    metricas,
  };
}

/**
 * Verifica si existe el reporte automático del último mes cerrado; si no existe, lo genera automáticamente
 * y lo registra en el log de auditoría (HU18 Escenario 5).
 */
export async function asegurarReporteMensualAutomatico() {
  const rangoMesAnterior = resolverRangoPeriodo({ periodo: 'mes_anterior' });
  const etiquetaClave = `${rangoMesAnterior.fechaInicio} a ${rangoMesAnterior.fechaFin}`;

  const existente = await prisma.auditoria.findFirst({
    where: {
      tablaAfectada: 'reporte_metricas',
      accion: 'GENERAR_REPORTE_AUTOMATICO',
      descripcion: {
        contains: etiquetaClave,
      },
    },
  });

  if (existente) {
    return null;
  }

  return generarYGuardarReporte(
    {
      periodo: 'personalizado',
      fechaInicio: rangoMesAnterior.fechaInicio,
      fechaFin: rangoMesAnterior.fechaFin,
    },
    { esAutomatico: true }
  );
}

/**
 * Lista todos los reportes generados (automáticos y manuales) disponibles para su consulta.
 */
export async function listarReportesDisponibles() {
  // Asegurar de manera transparente que el reporte mensual automático del último período cerrado esté generado
  try {
    await asegurarReporteMensualAutomatico();
  } catch (error) {
    console.error('Aviso al verificar reporte automático mensual:', error);
  }

  const registros = await prisma.auditoria.findMany({
    where: {
      tablaAfectada: 'reporte_metricas',
      accion: {
        in: ['GENERAR_REPORTE_AUTOMATICO', 'GENERAR_REPORTE_METRICAS'],
      },
    },
    include: {
      usuario: {
        select: {
          idUsuario: true,
          nombre: true,
          apellido: true,
          dni: true,
        },
      },
    },
    orderBy: { fechaHora: 'desc' },
    take: 50,
  });

  return registros.map((reg) => {
    let payload: any = null;
    try {
      payload = reg.datosNuevos ? JSON.parse(reg.datosNuevos) : null;
    } catch {
      payload = null;
    }

    const metricas = payload?.metricas;
    return {
      idReporte: reg.idAuditoria,
      tipoGeneracion:
        payload?.tipoGeneracion ||
        (reg.accion === 'GENERAR_REPORTE_AUTOMATICO' ? 'AUTOMATICO' : 'MANUAL'),
      fechaGeneracion: reg.fechaHora,
      descripcion: reg.descripcion,
      generadoPor: reg.usuario
        ? `${reg.usuario.nombre} ${reg.usuario.apellido} (DNI ${reg.usuario.dni})`
        : 'Sistema (Generación programada)',
      periodo: metricas?.periodo || null,
      resumenIndicadores: metricas?.indicadoresPrincipales || null,
    };
  });
}

/**
 * Obtiene un reporte generado específico por su ID.
 */
export async function obtenerReportePorId(idReporte: number) {
  const reg = await prisma.auditoria.findFirst({
    where: {
      idAuditoria: idReporte,
      tablaAfectada: 'reporte_metricas',
    },
    include: {
      usuario: {
        select: {
          idUsuario: true,
          nombre: true,
          apellido: true,
          dni: true,
        },
      },
    },
  });

  if (!reg) {
    throw new AppError('Reporte no encontrado.', 404);
  }

  let payload: any = null;
  try {
    payload = reg.datosNuevos ? JSON.parse(reg.datosNuevos) : null;
  } catch {
    payload = null;
  }

  return {
    idReporte: reg.idAuditoria,
    tipoGeneracion:
      payload?.tipoGeneracion ||
      (reg.accion === 'GENERAR_REPORTE_AUTOMATICO' ? 'AUTOMATICO' : 'MANUAL'),
    fechaGeneracion: reg.fechaHora,
    descripcion: reg.descripcion,
    generadoPor: reg.usuario
      ? `${reg.usuario.nombre} ${reg.usuario.apellido} (DNI ${reg.usuario.dni})`
      : 'Sistema (Generación programada)',
    metricas: payload?.metricas || null,
  };
}

// ============================================================================
// Escenario 6: Exportación de reporte en formato PDF o Excel
// ============================================================================

function escaparXml(texto: unknown): string {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Genera un archivo Excel (.xls en formato SpreadsheetML XML nativo de Microsoft Excel)
 * con múltiples hojas: Resumen de KPIs, Especialidades, Evolución por Día y Profesionales.
 */
export function generarArchivoExcelReporte(
  panel: Awaited<ReturnType<typeof obtenerPanelMetricas>>
): Buffer {
  const kpi = panel.indicadoresPrincipales;
  const cap = panel.metricasCapacidadOcupacion;
  const canc = panel.cancelacionesDetalle;
  const pac = panel.metricasPacientes;

  const filasEspecialidades = panel.graficos.distribucionPorEspecialidad
    .map(
      (e) => `
      <Row>
        <Cell><Data ss:Type="String">${escaparXml(e.especialidad)}</Data></Cell>
        <Cell><Data ss:Type="Number">${e.totalTurnos}</Data></Cell>
        <Cell><Data ss:Type="Number">${e.porcentajeSobreTotal}</Data></Cell>
        <Cell><Data ss:Type="Number">${e.realizados}</Data></Cell>
        <Cell><Data ss:Type="Number">${e.cancelados}</Data></Cell>
        <Cell><Data ss:Type="Number">${e.ausentes}</Data></Cell>
        <Cell><Data ss:Type="Number">${e.reprogramados}</Data></Cell>
      </Row>`
    )
    .join('');

  const filasDias = panel.graficos.evolucionPorDiaSemana
    .map(
      (d) => `
      <Row>
        <Cell><Data ss:Type="String">${escaparXml(d.nombreDia)}</Data></Cell>
        <Cell><Data ss:Type="Number">${d.total}</Data></Cell>
        <Cell><Data ss:Type="Number">${d.realizados}</Data></Cell>
        <Cell><Data ss:Type="Number">${d.cancelados}</Data></Cell>
        <Cell><Data ss:Type="Number">${d.ausentes}</Data></Cell>
        <Cell><Data ss:Type="Number">${d.reprogramados}</Data></Cell>
        <Cell><Data ss:Type="Number">${d.pendientes}</Data></Cell>
      </Row>`
    )
    .join('');

  const filasProfesionales = panel.rendimientoPorProfesional
    .map(
      (p) => `
      <Row>
        <Cell><Data ss:Type="String">${escaparXml(p.nombreCompleto)}</Data></Cell>
        <Cell><Data ss:Type="String">${escaparXml(p.matricula)}</Data></Cell>
        <Cell><Data ss:Type="String">${escaparXml(p.especialidades.join(', '))}</Data></Cell>
        <Cell><Data ss:Type="Number">${p.totalTurnos}</Data></Cell>
        <Cell><Data ss:Type="Number">${p.realizados}</Data></Cell>
        <Cell><Data ss:Type="Number">${p.cancelados}</Data></Cell>
        <Cell><Data ss:Type="Number">${p.ausentes}</Data></Cell>
        <Cell><Data ss:Type="Number">${p.tasaEfectividadPct}</Data></Cell>
        <Cell><Data ss:Type="Number">${p.tasaAusentismoPct}</Data></Cell>
      </Row>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Indicadores Generales">
    <Table>
      <Row><Cell><Data ss:Type="String">REPORTE DE MÉTRICAS DEL CENTRO DE SALUD</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Período</Data></Cell><Cell><Data ss:Type="String">${escaparXml(panel.periodo.etiqueta)}</Data></Cell></Row>
      <Row/>
      <Row><Cell><Data ss:Type="String">Indicador</Data></Cell><Cell><Data ss:Type="String">Valor</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Total de Turnos del Período</Data></Cell><Cell><Data ss:Type="Number">${kpi.totalTurnos}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Porcentaje de Ausentismo (%)</Data></Cell><Cell><Data ss:Type="Number">${kpi.porcentajeAusentismo}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Cantidad de Ausentes</Data></Cell><Cell><Data ss:Type="Number">${kpi.cantidadAusentes}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Porcentaje de Cancelaciones (%)</Data></Cell><Cell><Data ss:Type="Number">${kpi.porcentajeCancelaciones}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Cantidad de Cancelaciones</Data></Cell><Cell><Data ss:Type="Number">${kpi.cantidadCancelados}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Tasa de Efectividad / Atención Real (%)</Data></Cell><Cell><Data ss:Type="Number">${kpi.tasaEfectividadAtencion.porcentajeEfectividad}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Especialidad Más Demandada</Data></Cell><Cell><Data ss:Type="String">${escaparXml(kpi.especialidadMasDemandada ? `${kpi.especialidadMasDemandada.nombre} (${kpi.especialidadMasDemandada.cantidadTurnos})` : 'Sin datos')}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Tasa de Ocupación de Agenda (%)</Data></Cell><Cell><Data ss:Type="Number">${cap.tasaOcupacionAgendaPct}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Slots Disponibles Totales</Data></Cell><Cell><Data ss:Type="Number">${cap.slotsDisponiblesTotales}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Capacidad Ociosa (Slots no aprovechados)</Data></Cell><Cell><Data ss:Type="Number">${cap.capacidadOciosaSlots}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Antelación Promedio de Cancelación (Horas)</Data></Cell><Cell><Data ss:Type="String">${escaparXml(canc.antelacionPromedioHoras ?? 'N/A')}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Anticipación Promedio de Reserva - Lead Time (Días)</Data></Cell><Cell><Data ss:Type="String">${escaparXml(panel.tiemposAccesibilidad.leadTimePromedioDias ?? 'N/A')}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Pacientes Únicos en el Período</Data></Cell><Cell><Data ss:Type="Number">${pac.pacientesUnicosAtendidosOAgendados}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Pacientes Nuevos (%)</Data></Cell><Cell><Data ss:Type="Number">${pac.pacientesNuevos.porcentaje}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Pacientes Recurrentes (%)</Data></Cell><Cell><Data ss:Type="Number">${pac.pacientesRecurrentes.porcentaje}</Data></Cell></Row>
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Por Especialidad">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Especialidad</Data></Cell>
        <Cell><Data ss:Type="String">Total Turnos</Data></Cell>
        <Cell><Data ss:Type="String">% sobre Total</Data></Cell>
        <Cell><Data ss:Type="String">Realizados</Data></Cell>
        <Cell><Data ss:Type="String">Cancelados</Data></Cell>
        <Cell><Data ss:Type="String">Ausentes</Data></Cell>
        <Cell><Data ss:Type="String">Reprogramados</Data></Cell>
      </Row>
      ${filasEspecialidades}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Por Día de Semana">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Día</Data></Cell>
        <Cell><Data ss:Type="String">Total</Data></Cell>
        <Cell><Data ss:Type="String">Realizados</Data></Cell>
        <Cell><Data ss:Type="String">Cancelados</Data></Cell>
        <Cell><Data ss:Type="String">Ausentes</Data></Cell>
        <Cell><Data ss:Type="String">Reprogramados</Data></Cell>
        <Cell><Data ss:Type="String">Pendientes</Data></Cell>
      </Row>
      ${filasDias}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Por Profesional">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Profesional</Data></Cell>
        <Cell><Data ss:Type="String">Matrícula</Data></Cell>
        <Cell><Data ss:Type="String">Especialidades</Data></Cell>
        <Cell><Data ss:Type="String">Total Turnos</Data></Cell>
        <Cell><Data ss:Type="String">Realizados</Data></Cell>
        <Cell><Data ss:Type="String">Cancelados</Data></Cell>
        <Cell><Data ss:Type="String">Ausentes</Data></Cell>
        <Cell><Data ss:Type="String">% Efectividad</Data></Cell>
        <Cell><Data ss:Type="String">% Ausentismo</Data></Cell>
      </Row>
      ${filasProfesionales}
    </Table>
  </Worksheet>
</Workbook>`;

  return Buffer.from(xml, 'utf-8');
}

function sanitizarTextoPdf(texto: string): string {
  // Convierte caracteres acentuados comunes a equivalentes WinAnsiEncoding o ASCII limpio para PDF base
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()\\]/g, (m) => `\\${m}`);
}

/**
 * Genera un documento PDF válido (estándar PDF 1.4) con el resumen ejecutivo de KPIs,
 * distribución por especialidad y evolución semanal de turnos.
 */
export function generarArchivoPdfReporte(
  panel: Awaited<ReturnType<typeof obtenerPanelMetricas>>
): Buffer {
  const kpi = panel.indicadoresPrincipales;
  const cap = panel.metricasCapacidadOcupacion;
  const canc = panel.cancelacionesDetalle;
  const pac = panel.metricasPacientes;

  const lineas: string[] = [
    'REPORTE DE METRICAS Y ESTADISTICAS - CENTRO DE SALUD',
    `Periodo: ${panel.periodo.etiqueta}`,
    `Fecha de emision: ${new Date().toISOString().slice(0, 10)}`,
    '------------------------------------------------------------------------',
    '1. INDICADORES PRINCIPALES (KPIs)',
    `   - Total de turnos del periodo: ${kpi.totalTurnos}`,
    `   - Porcentaje de ausentismo: ${kpi.porcentajeAusentismo}% (${kpi.cantidadAusentes} turnos)`,
    `   - Porcentaje de cancelaciones: ${kpi.porcentajeCancelaciones}% (${kpi.cantidadCancelados} turnos)`,
    `   - Tasa de efectividad / atencion real: ${kpi.tasaEfectividadAtencion.porcentajeEfectividad}% (${kpi.tasaEfectividadAtencion.cantidadRealizados} turnos)`,
    `   - Especialidad mas demandada: ${
      kpi.especialidadMasDemandada
        ? `${kpi.especialidadMasDemandada.nombre} (${kpi.especialidadMasDemandada.cantidadTurnos} turnos - ${kpi.especialidadMasDemandada.porcentajeSobreTotal}%)`
        : 'Sin datos'
    }`,
    '------------------------------------------------------------------------',
    '2. CAPACIDAD OPERATIVA, ACCESIBILIDAD Y PACIENTES',
    `   - Tasa de ocupacion de agenda: ${cap.tasaOcupacionAgendaPct}% (${cap.turnosOcupados}/${cap.slotsDisponiblesTotales} slots)`,
    `   - Capacidad ociosa: ${cap.capacidadOciosaSlots} slots libres`,
    `   - Antelacion promedio de cancelacion: ${canc.antelacionPromedioHoras !== null ? `${canc.antelacionPromedioHoras} hs (${canc.antelacionPromedioDias} dias)` : 'Sin registros'}`,
    `   - Tiempo promedio de anticipacion (Lead Time): ${panel.tiemposAccesibilidad.leadTimePromedioDias !== null ? `${panel.tiemposAccesibilidad.leadTimePromedioDias} dias` : 'Sin registros'}`,
    `   - Pacientes unicos: ${pac.pacientesUnicosAtendidosOAgendados} (Nuevos: ${pac.pacientesNuevos.porcentaje}% | Recurrentes: ${pac.pacientesRecurrentes.porcentaje}%)`,
    '------------------------------------------------------------------------',
    '3. DISTRIBUCION DE TURNOS POR ESPECIALIDAD',
  ];

  if (panel.graficos.distribucionPorEspecialidad.length === 0) {
    lineas.push('   No hay datos para el periodo seleccionado.');
  } else {
    for (const esp of panel.graficos.distribucionPorEspecialidad.slice(0, 12)) {
      lineas.push(
        `   - ${esp.especialidad}: ${esp.totalTurnos} turnos (${esp.porcentajeSobreTotal}%) | Realiz: ${esp.realizados} | Canc: ${esp.cancelados} | Aus: ${esp.ausentes}`
      );
    }
  }

  lineas.push('------------------------------------------------------------------------');
  lineas.push('4. EVOLUCION POR DIA DE LA SEMANA (Realizados vs Cancelados vs Ausentes)');
  for (const d of panel.graficos.evolucionPorDiaSemana) {
    lineas.push(
      `   - ${d.nombreDia}: Total ${d.total} | Realizados: ${d.realizados} | Cancelados: ${d.cancelados} | Ausentes: ${d.ausentes}`
    );
  }

  // Construcción del contenido gráfico del PDF
  const comandosTexto: string[] = ['BT', '/F1 10 Tf', '40 790 Td', '14 TL'];
  for (const linea of lineas) {
    comandosTexto.push(`(${sanitizarTextoPdf(linea)}) Tj T*`);
  }
  comandosTexto.push('ET');
  const streamContent = comandosTexto.join('\n');

  const objetos: string[] = [];
  objetos.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  objetos.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  objetos.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj'
  );
  objetos.push(
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj'
  );
  objetos.push(
    `5 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'utf-8')} >>\nstream\n${streamContent}\nendstream\nendobj`
  );

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objetos) {
    offsets.push(Buffer.byteLength(pdf, 'utf-8'));
    pdf += `${obj}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf-8');
  pdf += `xref\n0 ${objetos.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objetos.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf-8');
}
