import 'dotenv/config';
import { prisma } from './src/config/prisma';

async function main() {
  console.log('Buscando usuarios...');
  const profUser = await prisma.usuario.findUnique({where: {dni: '10000001'}, include: {profesional: true}});
  const p1User = await prisma.usuario.findUnique({where: {dni: '00000001'}, include: {paciente: true}});
  const p2User = await prisma.usuario.findUnique({where: {dni: '00000002'}, include: {paciente: true}});

  if (!profUser || !profUser.profesional) {
    console.log('No se encontró al profesional 10000001');
    return;
  }
  if (!p1User || !p1User.paciente) {
    console.log('No se encontró al paciente 00000001');
    return;
  }
  if (!p2User || !p2User.paciente) {
    console.log('No se encontró al paciente 00000002');
    return;
  }

  const idProfesional = profUser.profesional.idProfesional;
  const idPaciente1 = p1User.paciente.idPaciente;
  const idPaciente2 = p2User.paciente.idPaciente;

  console.log('Creando turnos...');
  const hoy = new Date();
  hoy.setUTCHours(10, 0, 0, 0); // 10:00 AM UTC

  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  
  await prisma.turno.create({
    data: {
      idProfesional,
      idPaciente: idPaciente1,
      fechaHora: hoy,
      estado: 'CONFIRMADO' as any,
    }
  });

  const hoyMasTarde = new Date(hoy);
  hoyMasTarde.setUTCHours(11, 30, 0, 0); // 11:30 AM UTC
  await prisma.turno.create({
    data: {
      idProfesional,
      idPaciente: idPaciente2,
      fechaHora: hoyMasTarde,
      estado: 'SOLICITADO' as any,
    }
  });

  await prisma.turno.create({
    data: {
      idProfesional,
      idPaciente: idPaciente1,
      fechaHora: manana,
      estado: 'SOLICITADO' as any,
    }
  });

  console.log('Turnos de prueba creados exitosamente.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
