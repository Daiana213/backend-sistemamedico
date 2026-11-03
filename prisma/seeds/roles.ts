import { PrismaClient } from '@prisma/client';

export async function seedRoles(prisma: PrismaClient) {
  console.log('Limpiando todos los datos existentes en la base de datos...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "estudio_medico",
      "consulta",
      "turno",
      "agenda_profesional",
      "profesional_especialidad",
      "profesional_obra_social",
      "antecedentes_medicos",
      "documento_responsable",
      "paciente_responsable",
      "codigo_verificacion",
      "auditoria",
      "refresh_token",
      "password_reset_token",
      "administrativo",
      "profesional",
      "paciente",
      "usuario_rol",
      "usuario",
      "plan",
      "obra_social",
      "especialidad",
      "rol"
    RESTART IDENTITY CASCADE;
  `);
  console.log('Base de datos limpiada correctamente.');

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
