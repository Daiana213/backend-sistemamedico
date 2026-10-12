import { PrismaClient } from '@prisma/client';

export async function seedAntecedentes(prisma: PrismaClient) {
  console.log('Creando antecedentes médicos...');

  const pacientes = await prisma.usuario.findMany({
    where: {
      dni: { in: ['00000001', '00000002'] }
    },
    include: { paciente: true }
  });

  for (const p of pacientes) {
    if (p.paciente) {
      await prisma.antecedentesMedicos.upsert({
        where: { idPaciente: p.paciente.idPaciente },
        update: {
          alergias: p.dni === '00000001' ? 'Penicilina' : 'Ninguna',
          enfermedadesCronicas: p.dni === '00000001' ? 'Asma leve' : 'Ninguna',
          grupoSanguineo: p.dni === '00000001' ? 'O+' : 'A-',
        },
        create: {
          idPaciente: p.paciente.idPaciente,
          alergias: p.dni === '00000001' ? 'Penicilina' : 'Ninguna',
          enfermedadesCronicas: p.dni === '00000001' ? 'Asma leve' : 'Ninguna',
          grupoSanguineo: p.dni === '00000001' ? 'O+' : 'A-',
        }
      });
    }
  }
  
  console.log('Antecedentes médicos creados con éxito.');
}
