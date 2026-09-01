import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
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
      nombreArchivo: true,
      rutaArchivo: true,
    },
  });

  if (!documento) {
    throw new AppError('Documento no encontrado.', 404);
  }

  const absolutePath = path.resolve(documento.rutaArchivo);

  if (!fs.existsSync(absolutePath)) {
    throw new AppError('El archivo no existe en el servidor.', 404);
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${documento.nombreArchivo}"`);

  res.sendFile(absolutePath);
});
