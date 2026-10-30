import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { requierePermisoGestionUsuarios } from '../middlewares/requierePermisoGestionUsuarios';
import {
  obraSocialSchema,
  planSchema,
  validarElegibilidadSchema,
  simularCoberturaTurnoSchema,
} from '../validations/obraSocialValidation';
import * as obraSocialController from '../controllers/obraSocialController';

const router = Router();
const customValidationMsg = {
  customMessage: 'Por favor, complete todos los campos obligatorios para continuar.',
};

// Selectores públicos / autenticados de obras sociales y sus planes
router.get('/', obraSocialController.listarObrasSociales);
router.get('/:idObraSocial/planes', obraSocialController.listarPlanesPorObraSocial);

// Validación de elegibilidad y cobertura de afiliados (Recepción / Admisión)
router.post(
  '/validar-elegibilidad',
  authenticate,
  validate(validarElegibilidadSchema),
  obraSocialController.validarElegibilidadController
);

// Simulación de cobertura médico-paciente y requisitos para la consulta
router.get(
  '/simular-cobertura',
  authenticate,
  obraSocialController.simularCoberturaController
);

router.post(
  '/simular-cobertura',
  authenticate,
  validate(simularCoberturaTurnoSchema),
  obraSocialController.simularCoberturaController
);

// ---- HU20: Gestión de Obras Sociales y Planes (Administrativo con permiso de gestión de usuarios) ----

// Rutas directas sobre planes (/obras-sociales/planes/:idPlan) — declaradas antes de /:idObraSocial
router.put(
  '/planes/:idPlan',
  authenticate,
  requierePermisoGestionUsuarios,
  validate(planSchema, customValidationMsg),
  obraSocialController.editarPlanController
);

router.patch(
  '/planes/:idPlan',
  authenticate,
  requierePermisoGestionUsuarios,
  validate(planSchema, customValidationMsg),
  obraSocialController.editarPlanController
);

router.delete(
  '/planes/:idPlan',
  authenticate,
  requierePermisoGestionUsuarios,
  obraSocialController.darDeBajaPlanController
);

router.patch(
  '/planes/:idPlan/baja',
  authenticate,
  requierePermisoGestionUsuarios,
  obraSocialController.darDeBajaPlanController
);

router.patch(
  '/planes/:idPlan/reactivar',
  authenticate,
  requierePermisoGestionUsuarios,
  obraSocialController.reactivarPlanController
);

// Consultar detalle de obra social por ID
router.get('/:idObraSocial', obraSocialController.obtenerObraSocial);

// Escenario 1: Alta de obra social
router.post(
  '/',
  authenticate,
  requierePermisoGestionUsuarios,
  validate(obraSocialSchema, customValidationMsg),
  obraSocialController.crearObraSocialController
);

// Escenario 4: Edición de obra social
router.put(
  '/:idObraSocial',
  authenticate,
  requierePermisoGestionUsuarios,
  validate(obraSocialSchema, customValidationMsg),
  obraSocialController.editarObraSocialController
);

router.patch(
  '/:idObraSocial',
  authenticate,
  requierePermisoGestionUsuarios,
  validate(obraSocialSchema, customValidationMsg),
  obraSocialController.editarObraSocialController
);

// Escenario 5: Baja lógica de obra social
router.delete(
  '/:idObraSocial',
  authenticate,
  requierePermisoGestionUsuarios,
  obraSocialController.darDeBajaObraSocialController
);

router.patch(
  '/:idObraSocial/baja',
  authenticate,
  requierePermisoGestionUsuarios,
  obraSocialController.darDeBajaObraSocialController
);

// Reactivación de obra social
router.patch(
  '/:idObraSocial/reactivar',
  authenticate,
  requierePermisoGestionUsuarios,
  obraSocialController.reactivarObraSocialController
);

// Escenario 2: Alta de plan asociado a una obra social
router.post(
  '/:idObraSocial/planes',
  authenticate,
  requierePermisoGestionUsuarios,
  validate(planSchema, customValidationMsg),
  obraSocialController.crearPlanController
);

// Escenario 4: Edición de plan anidado en obra social
router.put(
  '/:idObraSocial/planes/:idPlan',
  authenticate,
  requierePermisoGestionUsuarios,
  validate(planSchema, customValidationMsg),
  obraSocialController.editarPlanController
);

router.patch(
  '/:idObraSocial/planes/:idPlan',
  authenticate,
  requierePermisoGestionUsuarios,
  validate(planSchema, customValidationMsg),
  obraSocialController.editarPlanController
);

// Escenario 5: Baja lógica de plan anidado en obra social
router.delete(
  '/:idObraSocial/planes/:idPlan',
  authenticate,
  requierePermisoGestionUsuarios,
  obraSocialController.darDeBajaPlanController
);

router.patch(
  '/:idObraSocial/planes/:idPlan/baja',
  authenticate,
  requierePermisoGestionUsuarios,
  obraSocialController.darDeBajaPlanController
);

router.patch(
  '/:idObraSocial/planes/:idPlan/reactivar',
  authenticate,
  requierePermisoGestionUsuarios,
  obraSocialController.reactivarPlanController
);

export default router;
