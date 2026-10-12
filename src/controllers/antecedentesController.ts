import { Request, Response, NextFunction } from 'express';
import * as antecedentesService from '../services/antecedentesService';

export const getAntecedentes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idUsuario = req.usuario!.idUsuario;
    const antecedentes = await antecedentesService.obtenerAntecedentes(idUsuario);
    res.json({ data: antecedentes || {} });
  } catch (error) {
    next(error);
  }
};

export const upsertAntecedentes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idUsuario = req.usuario!.idUsuario;
    const datos = req.body;
    const ip = req.ip;

    const actualizados = await antecedentesService.upsertAntecedentes(idUsuario, datos, ip);
    res.json({ message: 'Antecedentes guardados correctamente.', data: actualizados });
  } catch (error) {
    next(error);
  }
};
