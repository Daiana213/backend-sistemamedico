import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { obtenerAgendaProfesional } from '../services/profesionalAgendaService';

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
