import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

export async function listarObrasSocialesActivas() {
  return prisma.obraSocial.findMany({
    where: { estado: 'ACTIVO' },
    orderBy: { nombre: 'asc' },
    select: {
      idObraSocial: true,
      nombre: true,
      descripcion: true,
      estado: true,
    },
  });
}

export async function listarPlanesActivosPorObraSocial(idObraSocial: number) {
  const obraSocial = await prisma.obraSocial.findUnique({
    where: { idObraSocial },
    select: { idObraSocial: true, nombre: true, estado: true },
  });

  if (!obraSocial) {
    throw new AppError('Obra social no encontrada.', 404);
  }

  return prisma.plan.findMany({
    where: {
      idObraSocial,
      estado: 'ACTIVO',
    },
    orderBy: { nombre: 'asc' },
    select: {
      idPlan: true,
      idObraSocial: true,
      nombre: true,
      descripcion: true,
      estado: true,
    },
  });
}
