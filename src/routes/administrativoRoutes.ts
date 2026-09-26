import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requierePermisoGestionUsuarios } from '../middlewares/requierePermisoGestionUsuarios';
import { requiereAdminActivo } from '../middlewares/requiereAdminActivo';
import { validate } from '../middlewares/validate';
import { registrarAdministrativoSchema } from '../validations/administrativoValidation';
import * as administrativoController from '../controllers/administrativoController';
import {
  listarMenores,
  aprobarMenor,
  rechazarMenor,
} from '../controllers/menorController';

const router = Router();

// Registro de administrativos (requiere permiso de gestión de usuarios)
router.post(
  '/registro',
  authenticate,
  requierePermisoGestionUsuarios,
  validate(registrarAdministrativoSchema),
  administrativoController.registrar
);

// Gestión y validación de menores pendientes (requiere admin activo)
router.get(
  '/menores-pendientes',
  authenticate,
  requiereAdminActivo,
  listarMenores
);

router.patch(
  '/menores/:id/aprobar',
  authenticate,
  requiereAdminActivo,
  aprobarMenor
);

router.patch(
  '/menores/:id/rechazar',
  authenticate,
  requiereAdminActivo,
  rechazarMenor
);

export default router;