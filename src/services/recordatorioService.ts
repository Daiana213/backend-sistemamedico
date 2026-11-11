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

let procesandoEnCurso = false;

/**
 * HU23: Envío automático de recordatorios preventivos dentro de las 24 horas previas al turno médico.
 * Evalúa turnos reservados o confirmados próximos (hasta 25 horas hacia adelante) que aún no tengan
 * recordatorio enviado e implementa hasta 3 reintentos.
 */
export async function procesarRecordatoriosProximos(ip = '127.0.0.1'): Promise<ResumenRecordatorios> {
  const resumen: ResumenRecordatorios = {
    procesados: 0,
    enviados: 0,
    omitidosMenor24hs: 0,
    errores: 0,
    detalles: [],
  };

  if (procesandoEnCurso) {
    return resumen;
  }

  procesandoEnCurso = true;

  try {
    const ahora = new Date();
    const hasta = new Date(ahora.getTime() + 25 * 60 * 60 * 1000);

    const turnos = await prisma.turno.findMany({
      where: {
        fechaHora: {
          gte: ahora,
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
            responsables: {
              include: {
                responsable: {
                  include: {
                    usuario: true,
                  },
                },
              },
            },
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
      const emailResponsable = turno.paciente.responsables?.[0]?.responsable?.usuario?.email;
      const emailPaciente = (
        paciente.email ||
        turno.paciente.emailAlternativo ||
        emailResponsable ||
        ''
      ).trim();

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

      const especialidadNombre =
        turno.profesional.especialidades[0]?.especialidad?.nombre || 'Consulta General';

      let enviadoExitoso = false;
      let ultimoError: any = null;

      for (let intento = 1; intento <= 3; intento++) {
        try {
          await enviarRecordatorioTurno24hs({
            idTurno: turno.idTurno,
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
  } finally {
    procesandoEnCurso = false;
  }
}

let intervaloRecordatoriosRef: NodeJS.Timeout | null = null;

/**
 * Inicia el cron / worker en segundo plano para procesar recordatorios periódicamente.
 */
export function iniciarWorkerRecordatorios(intervaloMs = 60 * 1000) {
  if (intervaloRecordatoriosRef) {
    return;
  }

  setTimeout(() => {
    procesarRecordatoriosProximos('127.0.0.1 (worker-init)').catch((err) => {
      console.error('Error al ejecutar worker de recordatorios inicial:', err);
    });
  }, 2000);

  intervaloRecordatoriosRef = setInterval(() => {
    procesarRecordatoriosProximos('127.0.0.1 (worker-cron)').catch((err) => {
      console.error('Error al ejecutar worker de recordatorios:', err);
    });
  }, intervaloMs);
}
