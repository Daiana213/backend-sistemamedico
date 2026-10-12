import { PrismaClient } from '@prisma/client';

export async function seedObrasSociales(prisma: PrismaClient) {
  console.log('Creando obras sociales y planes...');
  const obrasSocialesData = [
    { nombre: 'OSDE', planes: ['210', '310', '410', '510'] },
    { nombre: 'Swiss Medical', planes: ['SMG01', 'SMG02', 'SMG20'] },
    { nombre: 'Galeno', planes: ['Azul', 'Blanco', 'Oro'] },
    { nombre: 'Particular', planes: ['Sin Plan'] }
  ];

  for (const os of obrasSocialesData) {
    const obraSocial = await prisma.obraSocial.upsert({
      where: { nombre: os.nombre },
      update: {},
      create: { nombre: os.nombre, estado: 'ACTIVO' as any },
    });

    for (const plan of os.planes) {
      const planExistente = await prisma.plan.findFirst({
        where: { nombre: plan, idObraSocial: obraSocial.idObraSocial },
      });

      if (!planExistente) {
        await prisma.plan.create({
          data: {
            nombre: plan,
            estado: 'ACTIVO' as any,
            idObraSocial: obraSocial.idObraSocial,
          },
        });
      }
    }
  }
}
