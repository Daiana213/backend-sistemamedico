import { PrismaClient } from '@prisma/client';

export async function seedRoles(prisma: PrismaClient) {
  console.log('Creando roles...');
  const roles = ['ADMINISTRATIVO', 'PROFESIONAL', 'PACIENTE'];
  for (const nombre of roles) {
    await prisma.rol.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }
}
