import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requierePermisoGestionUsuarios } from '../middlewares/requierePermisoGestionUsuarios';
import { validate } from '../middlewares/validate';
import { registrarAdministrativoSchema } from '../validations/administrativoValidation';
import * as administrativoController from '../controllers/administrativoController';

const router = Router();

router.post(
  '/registro',
  authenticate,
  requierePermisoGestionUsuarios,
  validate(registrarAdministrativoSchema),
  administrativoController.registrar
);

export default router;