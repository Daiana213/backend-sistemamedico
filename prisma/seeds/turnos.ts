import { PrismaClient } from '@prisma/client';

export async function seedTurnos(prisma: PrismaClient) {
  console.log('Configurando turnos, consultas y agendas de prueba...');

  // 1. Obtener IDs de pacientes, profesional y plan de obra social
  const paciente1 = await prisma.usuario.findUnique({
    where: { dni: '00000001' },
    include: { paciente: true },
  });

  const paciente2 = await prisma.usuario.findUnique({
    where: { dni: '00000002' },
    include: { paciente: true },
  });

  const profesional1 = await prisma.usuario.findUnique({
    where: { dni: '10000001' },
    include: { profesional: true },
  });

  const planOsde = await prisma.plan.findFirst({
    where: { nombre: '210' },
  });

  const especialidadClinica = await prisma.especialidad.findFirst({
    where: { nombre: 'Clínica Médica' },
  });

  if (!paciente1?.paciente || !paciente2?.paciente || !profesional1?.profesional) {
    console.log('No se pudieron crear turnos: Pacientes o profesional no encontrados.');
    return;
  }

  const idPaciente1 = paciente1.paciente.idPaciente;
  const idPaciente2 = paciente2.paciente.idPaciente;
  const idProfesional = profesional1.profesional.idProfesional;

  // 2. Asignar Obra Social y Plan a los pacientes si no la tienen (para que su perfil quede 100% completo)
  if (planOsde) {
    await prisma.paciente.update({
      where: { idPaciente: idPaciente1 },
      data: { idPlan: planOsde.idPlan, sexo: 'MASCULINO' as any },
    });
    await prisma.paciente.update({
      where: { idPaciente: idPaciente2 },
      data: { idPlan: planOsde.idPlan, sexo: 'FEMENINO' as any },
    });
  }

  // 3. Asignar especialidad y agenda semanal al profesional
  if (especialidadClinica) {
    const espExiste = await prisma.profesionalEspecialidad.findUnique({
      where: {
        idProfesional_idEspecialidad: {
          idProfesional,
          idEspecialidad: especialidadClinica.idEspecialidad,
        },
      },
    });

    if (!espExiste) {
      await prisma.profesionalEspecialidad.create({
        data: {
          idProfesional,
          idEspecialidad: especialidadClinica.idEspecialidad,
          fechaAsignacion: new Date(),
          estado: 'ACTIVO',
        },
      });
    }
  }

  // Configurar agenda semanal (Lunes a Viernes de 08:00 a 18:00)
  for (let dia = 1; dia <= 5; dia++) {
    const agendaExiste = await prisma.agendaProfesional.findFirst({
      where: { idProfesional, diaSemana: dia },
    });

    if (!agendaExiste) {
      await prisma.agendaProfesional.create({
        data: {
          idProfesional,
          diaSemana: dia,
          horaInicio: '08:00',
          horaFin: '18:00',
          duracionTurnoMinutos: 30,
          estado: 'ACTIVO',
        },
      });
    }
  }

  // 4. Fechas de turnos dinámicas (Hoy, Ayer y Próximos días)
  const hoy = new Date();
  const turnoHoy1 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 10, 0, 0);
  const turnoHoy2 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 11, 30, 0);

  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  const turnoAyer = new Date(ayer.getFullYear(), ayer.getMonth(), ayer.getDate(), 15, 0, 0);

  const turnosCrear = [
    // Turno de HOY a las 10:00 para Paciente 1 (CONFIRMADO - listo para atender en Agenda Profesional)
    {
      idPaciente: idPaciente1,
      idProfesional,
      fechaHora: turnoHoy1,
      estado: 'CONFIRMADO' as any,
    },
    // Turno de HOY a las 11:30 para Paciente 2 (SOLICITADO)
    {
      idPaciente: idPaciente2,
      idProfesional,
      fechaHora: turnoHoy2,
      estado: 'SOLICITADO' as any,
    },
    // Turno previo completado con consulta cargada (para verificar Consultas Anteriores en Historia Clínica)
    {
      idPaciente: idPaciente1,
      idProfesional,
      fechaHora: turnoAyer,
      estado: 'COMPLETADO' as any,
      consulta: {
        motivoConsulta: 'Dolor lumbar persistente post esfuerzo físico y rigidez matinal.',
        diagnostico: 'Lumbalgia mecánica postural L4-L5.',
        tratamiento:
          'Kinesioterapia motora 10 sesiones, paracetamol 500 mg cada 8 hs según dolor. Se solicita resonancia lumbar y reposo relativo.',
        notasAdicionales:
          'Paciente refiere antecedentes de asma leve controlada. Se entrega orden médica para estudio por imágenes.',
      },
    },
  ];

  for (const item of turnosCrear) {
    const existe = await prisma.turno.findFirst({
      where: {
        idProfesional,
        fechaHora: item.fechaHora,
      },
    });

    if (!existe) {
      const nuevoTurno = await prisma.turno.create({
        data: {
          idPaciente: item.idPaciente,
          idProfesional: item.idProfesional,
          fechaHora: item.fechaHora,
          estado: item.estado,
        },
      });

      if (item.consulta) {
        await prisma.consulta.create({
          data: {
            idTurno: nuevoTurno.idTurno,
            motivoConsulta: item.consulta.motivoConsulta,
            diagnostico: item.consulta.diagnostico,
            tratamiento: item.consulta.tratamiento,
            notasAdicionales: item.consulta.notasAdicionales,
            fechaRealizacion: item.fechaHora,
          },
        });
      }
    }
  }

  console.log('Turnos, agendas y consultas previas configurados con éxito.');
}
