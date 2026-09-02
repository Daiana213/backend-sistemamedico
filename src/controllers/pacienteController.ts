import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as pacienteService from '../services/pacienteService';

const buildUploadcareUrl = (uuid: string) => `https://ucarecdn.com/${uuid}/`;

export const registrar = asyncHandler(async (req: Request, res: Response) => {
  const documentoUuid = typeof req.body?.documentoUuid === 'string' ? req.body.documentoUuid.trim() : '';
  const documentoNombre = typeof req.body?.documentoNombre === 'string' ? req.body.documentoNombre.trim() : '';
  const archivo = documentoUuid
    ? {
        nombreArchivo: documentoNombre || `documento-${documentoUuid}`,
        rutaArchivo: buildUploadcareUrl(documentoUuid),
      }
    : undefined;

  const { documentoUuid: _uuid, documentoNombre: _nombre, ...datosPaciente } = req.body;
  const resultado = await pacienteService.registrarPaciente(datosPaciente, archivo);
  res.status(201).json(resultado);
});