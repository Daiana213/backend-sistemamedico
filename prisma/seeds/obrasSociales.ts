import { PrismaClient } from '@prisma/client';

export async function seedObrasSociales(prisma: PrismaClient) {
  console.log('Creando obras sociales y planes...');
  const obrasSocialesData = [
    {
      nombre: 'OSDE',
      razonSocial: 'Organización de Servicios Directos Empresarios',
      cuit: '30-54674125-3',
      codigoRnos: '400800',
      tipo: 'MEDICINA_PREPAGA',
      planes: ['210', '310', '410', '510'],
    },
    {
      nombre: 'Swiss Medical',
      razonSocial: 'Swiss Medical S.A.',
      cuit: '30-65485516-8',
      codigoRnos: '900101',
      tipo: 'MEDICINA_PREPAGA',
      planes: ['SMG01', 'SMG02', 'SMG20'],
    },
    {
      nombre: 'Galeno',
      razonSocial: 'Galeno Argentina S.A.',
      cuit: '30-52242816-3',
      codigoRnos: '900202',
      tipo: 'MEDICINA_PREPAGA',
      planes: ['Azul', 'Blanco', 'Oro'],
    },
    {
      nombre: 'Particular',
      razonSocial: 'Atención Particular sin Cobertura',
      cuit: '30-00000000-0',
      codigoRnos: '000000',
      tipo: 'OTRA',
      planes: ['Sin Plan'],
    },
  ];

  for (const os of obrasSocialesData) {
    const obraSocial = await prisma.obraSocial.upsert({
      where: { nombre: os.nombre },
      update: {
        razonSocial: os.razonSocial,
        cuit: os.cuit,
        codigoRnos: os.codigoRnos,
        tipo: os.tipo as any,
        estado: 'ACTIVO' as any,
      },
      create: {
        nombre: os.nombre,
        razonSocial: os.razonSocial,
        cuit: os.cuit,
        codigoRnos: os.codigoRnos,
        tipo: os.tipo as any,
        estado: 'ACTIVO' as any,
      },
    });

    for (const plan of os.planes) {
      const planExistente = await prisma.plan.findFirst({
        where: { nombre: plan, idObraSocial: obraSocial.idObraSocial },
      });

      if (!planExistente) {
        await prisma.plan.create({
          data: {
            nombre: plan,
            descripcion: `Plan ${plan} de ${os.nombre}`,
            estado: 'ACTIVO' as any,
            idObraSocial: obraSocial.idObraSocial,
          },
        });
      }
    }
  }
}
