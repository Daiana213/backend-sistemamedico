import { PrismaClient } from '@prisma/client';

export async function seedTurnos(prisma: PrismaClient) {
  console.log('Creando turnos...');

  // Obtener IDs de pacientes y profesionales
  const paciente1 = await prisma.usuario.findUnique({
    where: { dni: '00000001' },
    include: { paciente: true }
  });

  const paciente2 = await prisma.usuario.findUnique({
    where: { dni: '00000002' },
    include: { paciente: true }
  });

  const profesional1 = await prisma.usuario.findUnique({
    where: { dni: '10000001' },
    include: { profesional: true }
  });

  if (paciente1?.paciente && paciente2?.paciente && profesional1?.profesional) {
    const idPaciente1 = paciente1.paciente.idPaciente;
    const idPaciente2 = paciente2.paciente.idPaciente;
    const idProfesional = profesional1.profesional.idProfesional;

    // Crear turnos si no existen (fechas fijas para evitar duplicados en cada ejecución)
    const turnosData = [
      { idPaciente: idPaciente1, idProfesional: idProfesional, fechaHora: new Date('2027-01-10T10:00:00Z'), estado: 'SOLICITADO' as any }, // Mañana
      { idPaciente: idPaciente2, idProfesional: idProfesional, fechaHora: new Date('2027-01-11T10:00:00Z'), estado: 'CONFIRMADO' as any } // Pasado mañana
    ];

    for (const turno of turnosData) {
      const turnoExistente = await prisma.turno.findFirst({
        where: {
          idPaciente: turno.idPaciente,
          idProfesional: turno.idProfesional,
          fechaHora: turno.fechaHora
        }
      });

      if (!turnoExistente) {
        await prisma.turno.create({
          data: turno
        });
      }
    }
    console.log('Turnos creados con éxito.');
  } else {
    console.log('No se pudieron crear turnos: Pacientes o profesional no encontrados.');
  }
}
