import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { requierePermisoGestionUsuarios } from '../middlewares/requierePermisoGestionUsuarios';
import {
  listarEspecialidadesController,
  obtenerEspecialidadPorIdController,
  crearEspecialidadController,
  editarEspecialidadController,
  darDeBajaEspecialidadController,
} from '../controllers/especialidadController';
import { especialidadSchema } from '../validations/especialidadValidation';

const router = Router();

// Listado de especialidades activas o completas (requiere autenticación)
router.get('/', authenticate, listarEspecialidadesController);

// HU14: Alta de especialidad
router.post(
  '/',
  authenticate,
  requierePermisoGestionUsuarios,
  validate(especialidadSchema),
  crearEspecialidadController
);

// HU14: Consultar especialidad por ID
router.get(
  '/:id',
  authenticate,
  requierePermisoGestionUsuarios,
  obtenerEspecialidadPorIdController
);

// HU14: Editar especialidad
router.put(
  '/:id',
  authenticate,
  requierePermisoGestionUsuarios,
  validate(especialidadSchema),
  editarEspecialidadController
);

// HU14: Baja lógica de especialidad (bloqueada si tiene profesionales asignados)
router.delete(
  '/:id',
  authenticate,
  requierePermisoGestionUsuarios,
  darDeBajaEspecialidadController
);

export default router;
