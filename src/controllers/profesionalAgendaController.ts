import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { obtenerAgendaProfesional, configurarAgenda } from '../services/profesionalAgendaService';

export const configurarMiAgenda = asyncHandler(async (req: Request, res: Response) => {
  const idProfesional = parseInt(req.params.id as string, 10);
  const usuarioAdminId = req.usuario!.idUsuario;

  const resultado = await configurarAgenda(idProfesional, req.body, usuarioAdminId);
  res.status(200).json(resultado);
});

export const obtenerMiAgenda = asyncHandler(async (req: Request, res: Response) => {
  // Tenant Isolation: Extraemos el ID confiable del JWT
  const idUsuario = req.usuario!.idUsuario;
  
  // Extraemos query params
  const { fecha, fechaInicio, fechaFin, estado } = req.query;

  const resultado = await obtenerAgendaProfesional({
    idUsuario,
    fecha: fecha as string,
    fechaInicio: fechaInicio as string,
    fechaFin: fechaFin as string,
    estado: estado as string,
  });

  res.status(200).json(resultado);
});

export const getDisponibilidad = asyncHandler(async (req: Request, res: Response) => {
  const idProfesional = parseInt(req.params.id as string, 10);
  const { fecha } = req.query;

  if (isNaN(idProfesional)) {
    throw new AppError('ID de profesional inválido.', 400);
  }

  if (!fecha || typeof fecha !== 'string') {
    throw new AppError('Debe proporcionar una fecha en formato YYYY-MM-DD.', 400);
  }

  const { obtenerDisponibilidad } = await import('../services/profesionalAgendaService');
  const resultado = await obtenerDisponibilidad(idProfesional, fecha);
  res.status(200).json(resultado);
});
