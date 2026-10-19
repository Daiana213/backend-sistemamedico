import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import {
  listarMenoresPendientes,
  aprobarRegistroMenor,
  rechazarRegistroMenor,
  reenviarDocumentacion,
  listarMenoresDeResponsable,
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

const MAPA_TIPOS_DOCUMENTO: Record<string, string> = {
  PARTIDA_NACIMIENTO: 'PARTIDA_NACIMIENTO',
  'Partida de nacimiento': 'PARTIDA_NACIMIENTO',
  'Partida de Nacimiento': 'PARTIDA_NACIMIENTO',
  LIBRETA_MATRIMONIO: 'LIBRETA_MATRIMONIO',
  'Libreta de matrimonio': 'LIBRETA_MATRIMONIO',
  'Libreta de Matrimonio': 'LIBRETA_MATRIMONIO',
  'Constancia de matrimonio': 'LIBRETA_MATRIMONIO',
  'Constancia de Matrimonio': 'LIBRETA_MATRIMONIO',
  SENTENCIA_ADOPCION: 'SENTENCIA_ADOPCION',
  'Sentencia de adopción': 'SENTENCIA_ADOPCION',
  'Sentencia de adopcion': 'SENTENCIA_ADOPCION',
  'Sentencia de Adopción': 'SENTENCIA_ADOPCION',
  'Certificado de adopción': 'SENTENCIA_ADOPCION',
  'Certificado de adopcion': 'SENTENCIA_ADOPCION',
  'Certificado de Adopción': 'SENTENCIA_ADOPCION',
};

// PATCH /pacientes/menores/:id/reenviar-documentacion
export const reenviarDoc = asyncHandler(async (req: Request, res: Response) => {
  const idPaciente = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(idPaciente)) throw new AppError('ID de paciente inválido.', 400);

  if (!req.file) throw new AppError('Por favor, adjuntá el documento requerido.', 400);

  const { tipoDocumento } = req.body;
  if (!tipoDocumento || typeof tipoDocumento !== 'string' || tipoDocumento.trim() === '') {
    throw new AppError('El tipo de documento es obligatorio.', 400);
  }

  const tipoNormalizado = MAPA_TIPOS_DOCUMENTO[tipoDocumento.trim()];
  if (!tipoNormalizado) {
    throw new AppError(
      'Tipo de documento inválido. Solo se acepta Partida de nacimiento, Libreta de matrimonio o Sentencia de adopción.',
      400
    );
  }

  const idUsuarioAutenticado = req.usuario!.idUsuario;

  const resultado = await reenviarDocumentacion(
    idPaciente,
    idUsuarioAutenticado,
    {
      nombreArchivo: req.file.originalname || req.file.filename,
      rutaArchivo: req.file.path || `/api/documentos/${req.file.filename}`,
    },
    tipoNormalizado
  );

  res.status(200).json(resultado);
});


// GET /pacientes/mis-menores
export const listarMisMenores = asyncHandler(async (req: Request, res: Response) => {
  const idUsuario = req.usuario!.idUsuario;
  const menores = await listarMenoresDeResponsable(idUsuario);
  res.status(200).json({ data: menores });
});