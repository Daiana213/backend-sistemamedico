import { prisma } from '../config/prisma';

export async function listarEspecialidades() {
  return prisma.especialidad.findMany({
    where: { estado: 'ACTIVO' },
    select: { idEspecialidad: true, nombre: true },
    orderBy: { nombre: 'asc' },
  });
}
