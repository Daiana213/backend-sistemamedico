import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import {
  listarMenoresPendientes,
  aprobarRegistroMenor,
  rechazarRegistroMenor,
  reenviarDocumentacion,
} from '../services/menorService';

// GET /administrativos/menores-pendientes
export const listarMenores = asyncHandler(async (req: Request, res: Response) => {
  const menores = await listarMenoresPendientes();
  res.status(200).json({ data: menores });
});

// PATCH /administrativos/menores/:id/aprobar
export const aprobarMenor = asyncHandler(async (req: Request, res: Response) => {
  const idPaciente = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(idPaciente)) throw new AppError('ID de paciente inválido.', 400);

  const idAdministrativo = req.usuario!.idUsuario;
  const ip = req.ip;

  const resultado = await aprobarRegistroMenor(idPaciente, idAdministrativo, ip);
  res.status(200).json(resultado);
});

// PATCH /administrativos/menores/:id/rechazar
export const rechazarMenor = asyncHandler(async (req: Request, res: Response) => {
  const idPaciente = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(idPaciente)) throw new AppError('ID de paciente inválido.', 400);

  const { motivo } = req.body;
  if (!motivo || typeof motivo !== 'string' || motivo.trim() === '') {
    throw new AppError('El motivo de rechazo es obligatorio.', 400);
  }

  const idAdministrativo = req.usuario!.idUsuario;
  const ip = req.ip;

  const resultado = await rechazarRegistroMenor(idPaciente, idAdministrativo, motivo.trim(), ip);
  res.status(200).json(resultado);
});

// PATCH /pacientes/menores/:id/reenviar-documentacion
export const reenviarDoc = asyncHandler(async (req: Request, res: Response) => {
  const idPaciente = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(idPaciente)) throw new AppError('ID de paciente inválido.', 400);

  if (!req.file) throw new AppError('Por favor, adjuntá el documento requerido.', 400);

  const { tipoDocumento } = req.body;
  if (!tipoDocumento || typeof tipoDocumento !== 'string' || tipoDocumento.trim() === '') {
    throw new AppError('El tipo de documento es obligatorio.', 400);
  }

  const idUsuarioAutenticado = req.usuario!.idUsuario;

  const resultado = await reenviarDocumentacion(
    idPaciente,
    idUsuarioAutenticado,
    {
      nombreArchivo: req.file.originalname,
      rutaArchivo: req.file.path,
    },
    tipoDocumento.trim()
  );

  res.status(200).json(resultado);
});