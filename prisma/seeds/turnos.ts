import { PrismaClient } from '@prisma/client';

export async function seedTurnos(prisma: PrismaClient) {
  console.log('Configurando especialidades, obras sociales, agendas, turnos y consultas...');

  const profQuiroga = await prisma.usuario.findUnique({
    where: { dni: '10000001' },
    include: { profesional: true },
  });
  const profMendez = await prisma.usuario.findUnique({
    where: { dni: '10000002' },
    include: { profesional: true },
  });
  const profPereyra = await prisma.usuario.findUnique({
    where: { dni: '10000003' },
    include: { profesional: true },
  });

  const pacJuan = await prisma.usuario.findUnique({
    where: { dni: '00000001' },
    include: { paciente: true },
  });
  const pacMaria = await prisma.usuario.findUnique({
    where: { dni: '00000002' },
    include: { paciente: true },
  });
  const pacCarlos = await prisma.usuario.findUnique({
    where: { dni: '32456789' },
    include: { paciente: true },
  });
  const pacSofia = await prisma.usuario.findUnique({
    where: { dni: '40123456' },
    include: { paciente: true },
  });

  if (
    !profQuiroga?.profesional ||
    !profMendez?.profesional ||
    !profPereyra?.profesional ||
    !pacJuan?.paciente ||
    !pacMaria?.paciente ||
    !pacCarlos?.paciente ||
    !pacSofia?.paciente
  ) {
    console.log('No se encontraron todos los perfiles requeridos para configurar turnos.');
    return;
  }

  const todosLosProfesionales = await prisma.profesional.findMany({
    include: { usuario: true },
  });
  const profPorDni = new Map(
    todosLosProfesionales.map((p) => [p.usuario.dni, p])
  );

  const especialidadesDb = await prisma.especialidad.findMany();
  const espPorNombre = new Map(
    especialidadesDb.map((e) => [e.nombre, e.idEspecialidad])
  );

  const asignacionesPorDni: Array<{ dni: string; especialidad: string }> = [
    { dni: '10000001', especialidad: 'Clínica Médica' },
    { dni: '10000001', especialidad: 'Diagnóstico por Imágenes' },
    { dni: '10000002', especialidad: 'Cardiología' },
    { dni: '10000002', especialidad: 'Diagnóstico por Imágenes' },
    { dni: '10000003', especialidad: 'Traumatología' },
    { dni: '10000004', especialidad: 'Pediatría' },
    { dni: '10000005', especialidad: 'Neurología' },
    { dni: '10000006', especialidad: 'Dermatología' },
    { dni: '10000007', especialidad: 'Oftalmología' },
    { dni: '10000008', especialidad: 'Ginecología' },
    { dni: '10000009', especialidad: 'Nutrición' },
    { dni: '10000010', especialidad: 'Psiquiatría' },
    { dni: '10000011', especialidad: 'Diagnóstico por Imágenes' },
  ];

  for (const item of asignacionesPorDni) {
    const prof = profPorDni.get(item.dni);
    const idEspecialidad = espPorNombre.get(item.especialidad);
    if (!prof || !idEspecialidad) continue;
    await prisma.profesionalEspecialidad.upsert({
      where: {
        idProfesional_idEspecialidad: {
          idProfesional: prof.idProfesional,
          idEspecialidad,
        },
      },
      update: { estado: 'ACTIVO' as any },
      create: {
        idProfesional: prof.idProfesional,
        idEspecialidad,
        fechaAsignacion: new Date(),
        estado: 'ACTIVO' as any,
      },
    });
  }

  // Vincular todas las obras sociales activas y agendas a todos los profesionales
  const obrasSociales = await prisma.obraSocial.findMany({ where: { estado: 'ACTIVO' } });
  const listaProfesionales = todosLosProfesionales.map((p) => p.idProfesional);

  for (const idProfesional of listaProfesionales) {
    for (const os of obrasSociales) {
      await prisma.profesionalObraSocial.upsert({
        where: {
          idProfesional_idObraSocial: {
            idProfesional,
            idObraSocial: os.idObraSocial,
          },
        },
        update: { estado: 'ACTIVO' as any },
        create: {
          idProfesional,
          idObraSocial: os.idObraSocial,
          fechaAsignacion: new Date(),
          estado: 'ACTIVO' as any,
        },
      });
    }

    // Agenda semanal Lunes a Viernes de 08:00 a 18:00
    for (let dia = 1; dia <= 5; dia++) {
      await prisma.agendaProfesional.create({
        data: {
          idProfesional,
          diaSemana: dia,
          horaInicio: '08:00',
          horaFin: '18:00',
          duracionTurnoMinutos: 30,
          estado: 'ACTIVO' as any,
        },
      });
    }
  }

  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  const haceTresDias = new Date(hoy);
  haceTresDias.setDate(haceTresDias.getDate() - 3);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  const fHora = (base: Date, h: number, m: number) =>
    new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0);

  const turnosCrear = [
    // Turnos de HOY para Dr. Martín Quiroga (10000001)
    {
      idPaciente: pacJuan.paciente.idPaciente,
      idProfesional: profQuiroga.profesional.idProfesional,
      fechaHora: fHora(hoy, 9, 30),
      estado: 'CONFIRMADO' as any,
      presente: true,
      fechaLlegada: fHora(hoy, 9, 20),
      numeroAutorizacion: 'AUT-2026-9001',
    },
    {
      idPaciente: pacMaria.paciente.idPaciente,
      idProfesional: profQuiroga.profesional.idProfesional,
      fechaHora: fHora(hoy, 10, 30),
      estado: 'CONFIRMADO' as any,
      presente: true,
      fechaLlegada: fHora(hoy, 10, 22),
      numeroAutorizacion: 'AUT-2026-9002',
    },
    {
      idPaciente: pacCarlos.paciente.idPaciente,
      idProfesional: profQuiroga.profesional.idProfesional,
      fechaHora: fHora(hoy, 11, 30),
      estado: 'SOLICITADO' as any,
      numeroAutorizacion: 'AUT-2026-9003',
    },
    {
      idPaciente: pacSofia.paciente.idPaciente,
      idProfesional: profQuiroga.profesional.idProfesional,
      fechaHora: fHora(hoy, 14, 0),
      estado: 'CONFIRMADO' as any,
      numeroAutorizacion: 'AUT-2026-9004',
    },
    // Turnos con Dra. Valeria Méndez (10000002)
    {
      idPaciente: pacJuan.paciente.idPaciente,
      idProfesional: profMendez.profesional.idProfesional,
      fechaHora: fHora(hoy, 10, 0),
      estado: 'CONFIRMADO' as any,
      numeroAutorizacion: 'AUT-2026-9005',
    },
    {
      idPaciente: pacCarlos.paciente.idPaciente,
      idProfesional: profMendez.profesional.idProfesional,
      fechaHora: fHora(ayer, 16, 0),
      estado: 'COMPLETADO' as any,
      presente: true,
      consulta: {
        motivoConsulta: 'Control periódico de hipertensión arterial y evaluación de estudios de tórax.',
        diagnostico: 'Hipertensión arterial esencial compensada (TA 125/80 mmHg).',
        tratamiento: 'Continuar con Enalapril 10 mg cada 24 hs, dieta hiposódica y actividad aeróbica 30 min diarios.',
        notasAdicionales: 'Se revisaron radiografía digital de tórax y tomografía sin hallazgos patológicos agudos.',
      },
    },
    // Turnos con Dr. Santiago Pereyra (10000003)
    {
      idPaciente: pacJuan.paciente.idPaciente,
      idProfesional: profPereyra.profesional.idProfesional,
      fechaHora: fHora(haceTresDias, 15, 0),
      estado: 'COMPLETADO' as any,
      presente: true,
      consulta: {
        motivoConsulta: 'Gonalgia derecha post actividad deportiva e inestabilidad leve.',
        diagnostico: 'Distensión capsuloligamentaria leve de rodilla derecha sin lesión meniscal.',
        tratamiento: 'Fisioterapia y rehabilitación kinésica 10 sesiones. Crioterapia local.',
        notasAdicionales: 'Resonancia magnética y tomografía articular muestran estructuras meniscales y cruzados conservados.',
      },
    },
    {
      idPaciente: pacMaria.paciente.idPaciente,
      idProfesional: profQuiroga.profesional.idProfesional,
      fechaHora: fHora(ayer, 11, 0),
      estado: 'COMPLETADO' as any,
      presente: true,
      consulta: {
        motivoConsulta: 'Control clínico anual y revisión de estudios diagnósticos por imágenes.',
        diagnostico: 'Paciente clínicamente estable, eutiroidea bajo tratamiento sustitutivo.',
        tratamiento: 'Mantener Levotiroxina 50 mcg en ayunas. Control en 6 meses.',
        notasAdicionales: 'Radiografía de tórax y resonancia cerebral dentro de parámetros normales.',
      },
    },
    {
      idPaciente: pacSofia.paciente.idPaciente,
      idProfesional: profMendez.profesional.idProfesional,
      fechaHora: fHora(manana, 9, 0),
      estado: 'CONFIRMADO' as any,
      numeroAutorizacion: 'AUT-2026-9010',
    },
  ];

  for (const item of turnosCrear) {
    const nuevoTurno = await prisma.turno.create({
      data: {
        idPaciente: item.idPaciente,
        idProfesional: item.idProfesional,
        fechaHora: item.fechaHora,
        estado: item.estado,
        presente: item.presente ?? false,
        fechaLlegada: item.fechaLlegada ?? null,
        numeroAutorizacion: item.numeroAutorizacion ?? null,
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

  console.log('Turnos, agendas y consultas previas configurados con éxito.');
}
