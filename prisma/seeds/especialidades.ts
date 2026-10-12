import { PrismaClient } from '@prisma/client';

export async function seedEspecialidades(prisma: PrismaClient) {
  console.log('Creando especialidades...');
  const especialidades = [
    { nombre: 'Clínica Médica', estado: 'ACTIVO' },
    { nombre: 'Cardiología', estado: 'ACTIVO' },
    { nombre: 'Pediatría', estado: 'ACTIVO' },
    { nombre: 'Traumatología', estado: 'ACTIVO' },
    { nombre: 'Neurología', estado: 'ACTIVO' },
    { nombre: 'Dermatología', estado: 'ACTIVO' },
    { nombre: 'Oftalmología', estado: 'ACTIVO' },
    { nombre: 'Ginecología', estado: 'ACTIVO' },
    { nombre: 'Nutrición', estado: 'ACTIVO' },
    { nombre: 'Psiquiatría', estado: 'ACTIVO' }
  ];

  for (const esp of especialidades) {
    await prisma.especialidad.upsert({
      where: { nombre: esp.nombre },
      update: { estado: 'ACTIVO' as any },
      create: { nombre: esp.nombre, estado: 'ACTIVO' as any },
    });
  }
}
