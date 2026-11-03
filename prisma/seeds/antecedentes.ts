import { PrismaClient } from '@prisma/client';

export async function seedAntecedentes(prisma: PrismaClient) {
  console.log('Creando antecedentes médicos...');

  const antecedentesPorDni: Record<
    string,
    { alergias: string; enfermedadesCronicas: string; grupoSanguineo: string }
  > = {
    '00000001': {
      alergias: 'Penicilina y derivados betalactámicos',
      enfermedadesCronicas: 'Asma bronquial leve intermitente controlada',
      grupoSanguineo: 'O+',
    },
    '00000002': {
      alergias: 'Sin alergias medicamentosas conocidas',
      enfermedadesCronicas: 'Hipotiroidismo primario en tratamiento con Levotiroxina 50 mcg/día',
      grupoSanguineo: 'A+',
    },
    '32456789': {
      alergias: 'Antiinflamatorios no esteroideos (Ibuprofeno / Diclofenac)',
      enfermedadesCronicas: 'Hipertensión arterial esencial controlada con Enalapril 10 mg',
      grupoSanguineo: 'B+',
    },
    '40123456': {
      alergias: 'Ninguna',
      enfermedadesCronicas: 'Migraña episódica sin aura',
      grupoSanguineo: 'O-',
    },
    '55123456': {
      alergias: 'Ninguna',
      enfermedadesCronicas: 'Sin patologías crónicas',
      grupoSanguineo: 'O+',
    },
  };

  for (const [dni, datos] of Object.entries(antecedentesPorDni)) {
    const usuario = await prisma.usuario.findUnique({
      where: { dni },
      include: { paciente: true },
    });

    if (usuario?.paciente) {
      await prisma.antecedentesMedicos.upsert({
        where: { idPaciente: usuario.paciente.idPaciente },
        update: datos,
        create: {
          idPaciente: usuario.paciente.idPaciente,
          ...datos,
        },
      });
    }
  }

  console.log('Antecedentes médicos creados con éxito.');
}
