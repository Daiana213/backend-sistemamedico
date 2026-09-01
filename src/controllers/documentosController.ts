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

  const rutaArchivo = documento.rutaArchivo?.trim();

  if (rutaArchivo && /^https?:\/\//i.test(rutaArchivo)) {
    return res.status(200).json({
      url: rutaArchivo,
      nombreArchivo: documento.nombreArchivo,
    });
  }

  const absolutePath = path.resolve(rutaArchivo || '');

  if (!rutaArchivo || !fs.existsSync(absolutePath)) {
    throw new AppError('El archivo no existe en el servidor.', 404);
  }

  const extension = path.extname(absolutePath).toLowerCase();
  const contentType =
    extension === '.pdf'
      ? 'application/pdf'
      : extension === '.png'
        ? 'image/png'
        : extension === '.jpg' || extension === '.jpeg'
          ? 'image/jpeg'
          : extension === '.webp'
            ? 'image/webp'
            : 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${documento.nombreArchivo}"`);

  return res.sendFile(absolutePath);
});
