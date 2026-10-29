import { prisma } from '../config/prisma';
import { enviarRecordatorioTurno24hs } from './email.service';

interface ResumenRecordatorios {
  procesados: number;
  enviados: number;
  omitidosMenor24hs: number;
  errores: number;
  detalles: Array<{
    idTurno: number;
    email: string;
    estado: 'ENVIADO' | 'OMITIDO_MENOS_24HS' | 'ERROR';
    motivo?: string;
  }>;
}

/**
 * HU23: Envío automático de recordatorios preventivos 24 horas antes del turno médico.
 * Evalúa turnos reservados o confirmados en una ventana de 23 a 25 horas posteriores,
 * omite citas creadas con menos de 24 hs de anticipación e implementa hasta 3 reintentos.
 */
export async function procesarRecordatoriosProximos(ip = '127.0.0.1'): Promise<ResumenRecordatorios> {
  const ahora = new Date();
  const desde = new Date(ahora.getTime() + 23 * 60 * 60 * 1000);
  const hasta = new Date(ahora.getTime() + 25 * 60 * 60 * 1000);

  const resumen: ResumenRecordatorios = {
    procesados: 0,
    enviados: 0,
    omitidosMenor24hs: 0,
    errores: 0,
    detalles: [],
  };

  const turnos = await prisma.turno.findMany({
    where: {
      fechaHora: {
        gte: desde,
        lte: hasta,
      },
      estado: {
        in: ['SOLICITADO', 'CONFIRMADO'],
      },
      recordatorioEnviado: false,
    },
    include: {
      paciente: {
        include: {
          usuario: true,
        },
      },
      profesional: {
        include: {
          usuario: true,
          especialidades: {
            include: {
              especialidad: true,
            },
          },
        },
      },
    },
    orderBy: {
      fechaHora: 'asc',
    },
  });

  resumen.procesados = turnos.length;

  for (const turno of turnos) {
    const paciente = turno.paciente.usuario;
    const profesional = turno.profesional.usuario;
    const emailPaciente = paciente.email?.trim();

    if (!emailPaciente) {
      resumen.errores++;
      resumen.detalles.push({
        idTurno: turno.idTurno,
        email: '',
        estado: 'ERROR',
        motivo: 'El paciente no posee un correo electrónico registrado.',
      });
      continue;
    }

    // Regla de negocio HU23: Omitir recordatorios para turnos creados con < 24hs de anticipación
    const diferenciaCreacionMs = turno.fechaHora.getTime() - turno.fechaCreacion.getTime();
    const horasDiferencia = diferenciaCreacionMs / (1000 * 60 * 60);

    if (horasDiferencia < 24) {
      // Se marca como procesado para no volver a evaluarlo continuamente
      await prisma.turno.update({
        where: { idTurno: turno.idTurno },
        data: {
          recordatorioEnviado: true,
          fechaRecordatorio: new Date(),
        },
      });

      resumen.omitidosMenor24hs++;
      resumen.detalles.push({
        idTurno: turno.idTurno,
        email: emailPaciente,
        estado: 'OMITIDO_MENOS_24HS',
        motivo: `Turno agendado con ${horasDiferencia.toFixed(1)} hs de anticipación (< 24 hs).`,
      });
      continue;
    }

    const especialidadNombre =
      turno.profesional.especialidades[0]?.especialidad?.nombre || 'Consulta General';

    // Hasta 3 reintentos en caso de falla transitoria con el proveedor SMTP
    let enviadoExitoso = false;
    let ultimoError: any = null;

    for (let intento = 1; intento <= 3; intento++) {
      try {
        await enviarRecordatorioTurno24hs({
          emailPaciente,
          nombrePaciente: `${paciente.nombre} ${paciente.apellido}`.trim(),
          nombreProfesional: `${profesional.nombre} ${profesional.apellido}`.trim(),
          especialidad: especialidadNombre,
          fechaHora: turno.fechaHora,
        });
        enviadoExitoso = true;
        break;
      } catch (err) {
        ultimoError = err;
        // Espera corta antes de reintentar
        await new Promise((resolve) => setTimeout(resolve, 500 * intento));
      }
    }

    if (enviadoExitoso) {
      await prisma.$transaction(async (tx) => {
        await tx.turno.update({
          where: { idTurno: turno.idTurno },
          data: {
            recordatorioEnviado: true,
            fechaRecordatorio: new Date(),
          },
        });

        await tx.auditoria.create({
          data: {
            idUsuario: turno.paciente.idUsuario,
            fechaHora: new Date(),
            accion: 'ENVIO_RECORDATORIO_TURNO',
            tablaAfectada: 'turno',
            idRegistroAfectado: turno.idTurno,
            datosNuevos: JSON.stringify({
              idTurno: turno.idTurno,
              email: emailPaciente,
              fechaHoraTurno: turno.fechaHora,
              profesional: `${profesional.nombre} ${profesional.apellido}`,
            }),
            ip,
            descripcion: `Recordatorio automático 24 hs enviado con éxito a ${emailPaciente} para el turno #${turno.idTurno}.`,
          },
        });
      });

      resumen.enviados++;
      resumen.detalles.push({
        idTurno: turno.idTurno,
        email: emailPaciente,
        estado: 'ENVIADO',
      });
    } else {
      resumen.errores++;
      resumen.detalles.push({
        idTurno: turno.idTurno,
        email: emailPaciente,
        estado: 'ERROR',
        motivo: ultimoError?.message || 'Falla al despachar el correo tras 3 intentos.',
      });
    }
  }

  return resumen;
}

let intervaloRecordatoriosRef: NodeJS.Timeout | null = null;

/**
 * Inicia el cron / worker en segundo plano para procesar recordatorios periódicamente.
 */
export function iniciarWorkerRecordatorios(intervaloMs = 30 * 60 * 1000) {
  if (intervaloRecordatoriosRef) {
    return;
  }

  // Ejecución inicial diferida
  setTimeout(() => {
    procesarRecordatoriosProximos('127.0.0.1 (worker-init)').catch((err) => {
      console.error('Error al ejecutar worker de recordatorios inicial:', err);
    });
  }, 10000);

  // Ejecución periódica cada 30 minutos
  intervaloRecordatoriosRef = setInterval(() => {
    procesarRecordatoriosProximos('127.0.0.1 (worker-cron)').catch((err) => {
      console.error('Error al ejecutar worker de recordatorios:', err);
    });
  }, intervaloMs);
}
