import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

export const obtenerDocumentoPorId = asyncHandler(async (req: Request, res: Response) => {
  const idDocumento = Number(req.params.idDocumento);

  if (!Number.isInteger(idDocumento) || idDocumento <= 0) {
    throw new AppError('ID de documento inválido.', 400);
  }

  const documento = await prisma.documentoResponsable.findUnique({
    where: { idDocumento },
    select: {
      idDocumento: true,
      nombreArchivo: true,
      rutaArchivo: true,
    },
  });

  if (!documento) {
    throw new AppError('Documento no encontrado.', 404);
  }

  return res.status(200).json({
    url: documento.rutaArchivo,
    nombreArchivo: documento.nombreArchivo,
  });
});
