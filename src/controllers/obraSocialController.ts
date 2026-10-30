import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import {
  listarObrasSocialesActivas,
  obtenerObraSocialPorId,
  listarPlanesActivosPorObraSocial,
  crearObraSocial,
  editarObraSocial,
  darDeBajaObraSocial,
  reactivarObraSocial,
  crearPlanObraSocial,
  editarPlanObraSocial,
  darDeBajaPlanObraSocial,
  reactivarPlanObraSocial,
  validarElegibilidadAfiliado,
} from '../services/obraSocialService';

function parsearIdParam(valor: string | string[] | undefined, nombreId: string): number {
  const raw = Array.isArray(valor) ? valor[0] : valor;
  const numero = Number.parseInt(raw || '', 10);
  if (Number.isNaN(numero)) {
    throw new AppError(`ID de ${nombreId} inválido.`, 400);
  }
  return numero;
}

export const listarObrasSociales = asyncHandler(async (req: Request, res: Response) => {
  const incluirInactivas = req.query.incluirInactivas === 'true';
  const obrasSociales = await listarObrasSocialesActivas(incluirInactivas);
  res.status(200).json(obrasSociales);
});

export const obtenerObraSocial = asyncHandler(async (req: Request, res: Response) => {
  const idObraSocial = parsearIdParam(req.params.idObraSocial || req.params.id, 'obra social');
  const incluirInactivos = req.query.incluirInactivas === 'true' || req.query.incluirInactivos === 'true';
  const obraSocial = await obtenerObraSocialPorId(idObraSocial, incluirInactivos);
  res.status(200).json(obraSocial);
});

export const listarPlanesPorObraSocial = asyncHandler(async (req: Request, res: Response) => {
  const idObraSocial = parsearIdParam(req.params.idObraSocial || req.params.id, 'obra social');
  const incluirInactivos = req.query.incluirInactivas === 'true' || req.query.incluirInactivos === 'true';
  const planes = await listarPlanesActivosPorObraSocial(idObraSocial, incluirInactivos);
  res.status(200).json(planes);
});

// HU20 - Escenario 1: Alta de obra social
export const crearObraSocialController = asyncHandler(async (req: Request, res: Response) => {
  const idAdministrativo = req.usuario!.idUsuario;
  const resultado = await crearObraSocial(req.body, idAdministrativo, req.ip);
  res.status(201).json(resultado);
});

// HU20 - Escenario 4: Edición de obra social
export const editarObraSocialController = asyncHandler(async (req: Request, res: Response) => {
  const idObraSocial = parsearIdParam(req.params.idObraSocial || req.params.id, 'obra social');
  const idAdministrativo = req.usuario!.idUsuario;
  const resultado = await editarObraSocial(idObraSocial, req.body, idAdministrativo, req.ip);
  res.status(200).json(resultado);
});

// HU20 - Escenario 5: Baja lógica de obra social
export const darDeBajaObraSocialController = asyncHandler(async (req: Request, res: Response) => {
  const idObraSocial = parsearIdParam(req.params.idObraSocial || req.params.id, 'obra social');
  const idAdministrativo = req.usuario!.idUsuario;
  const resultado = await darDeBajaObraSocial(idObraSocial, idAdministrativo, req.ip);
  res.status(200).json(resultado);
});

// Reactivación de obra social
export const reactivarObraSocialController = asyncHandler(async (req: Request, res: Response) => {
  const idObraSocial = parsearIdParam(req.params.idObraSocial || req.params.id, 'obra social');
  const idAdministrativo = req.usuario!.idUsuario;
  const resultado = await reactivarObraSocial(idObraSocial, idAdministrativo, req.ip);
  res.status(200).json(resultado);
});

// HU20 - Escenario 2: Alta de plan de una obra social
export const crearPlanController = asyncHandler(async (req: Request, res: Response) => {
  const idObraSocial = parsearIdParam(
    req.params.idObraSocial || req.params.id || req.body?.idObraSocial,
    'obra social'
  );
  const idAdministrativo = req.usuario!.idUsuario;
  const resultado = await crearPlanObraSocial(idObraSocial, req.body, idAdministrativo, req.ip);
  res.status(201).json(resultado);
});

// HU20 - Escenario 4: Edición de plan de una obra social
export const editarPlanController = asyncHandler(async (req: Request, res: Response) => {
  const idPlan = parsearIdParam(req.params.idPlan || req.params.id, 'plan');
  const idObraSocial = req.params.idObraSocial
    ? parsearIdParam(req.params.idObraSocial, 'obra social')
    : undefined;
  const idAdministrativo = req.usuario!.idUsuario;
  const resultado = await editarPlanObraSocial(idPlan, req.body, idAdministrativo, req.ip, idObraSocial);
  res.status(200).json(resultado);
});

// HU20 - Escenario 5: Baja lógica de plan de una obra social
export const darDeBajaPlanController = asyncHandler(async (req: Request, res: Response) => {
  const idPlan = parsearIdParam(req.params.idPlan || req.params.id, 'plan');
  const idObraSocial = req.params.idObraSocial
    ? parsearIdParam(req.params.idObraSocial, 'obra social')
    : undefined;
  const idAdministrativo = req.usuario!.idUsuario;
  const resultado = await darDeBajaPlanObraSocial(idPlan, idAdministrativo, req.ip, idObraSocial);
  res.status(200).json(resultado);
});

// Reactivación de plan
export const reactivarPlanController = asyncHandler(async (req: Request, res: Response) => {
  const idPlan = parsearIdParam(req.params.idPlan || req.params.id, 'plan');
  const idObraSocial = req.params.idObraSocial
    ? parsearIdParam(req.params.idObraSocial, 'obra social')
    : undefined;
  const idAdministrativo = req.usuario!.idUsuario;
  const resultado = await reactivarPlanObraSocial(idPlan, idAdministrativo, req.ip, idObraSocial);
  res.status(200).json(resultado);
});

// Validación de elegibilidad y cobertura de afiliados
export const validarElegibilidadController = asyncHandler(async (req: Request, res: Response) => {
  const resultado = await validarElegibilidadAfiliado(req.body);
  res.status(200).json(resultado);
});
