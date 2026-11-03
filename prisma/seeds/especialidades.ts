import { PrismaClient } from '@prisma/client';

export async function seedEspecialidades(prisma: PrismaClient) {
  console.log('Creando especialidades...');
  const especialidades = [
    { nombre: 'Clínica Médica', descripcion: 'Atención integral y seguimiento clínico de adultos' },
    { nombre: 'Cardiología', descripcion: 'Diagnóstico y tratamiento de patologías cardiovasculares' },
    { nombre: 'Diagnóstico por Imágenes', descripcion: 'Radiología digital, resonancia magnética, tomografía y ecografía' },
    { nombre: 'Traumatología', descripcion: 'Patologías del sistema osteoarticular y muscular' },
    { nombre: 'Pediatría', descripcion: 'Atención médica integral de niños y adolescentes' },
    { nombre: 'Neurología', descripcion: 'Trastornos del sistema nervioso central y periférico' },
    { nombre: 'Dermatología', descripcion: 'Prevención y tratamiento de afecciones de la piel' },
    { nombre: 'Oftalmología', descripcion: 'Salud visual y patologías oculares' },
    { nombre: 'Ginecología', descripcion: 'Salud integral de la mujer' },
    { nombre: 'Nutrición', descripcion: 'Evaluación nutricional y planes alimentarios clínicos' },
    { nombre: 'Psiquiatría', descripcion: 'Salud mental y seguimiento farmacológico' },
  ];

  for (const esp of especialidades) {
    await prisma.especialidad.upsert({
      where: { nombre: esp.nombre },
      update: { estado: 'ACTIVO' as any, descripcion: esp.descripcion },
      create: { nombre: esp.nombre, descripcion: esp.descripcion, estado: 'ACTIVO' as any },
    });
  }
}
