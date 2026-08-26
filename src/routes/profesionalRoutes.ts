import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { requierePermisoGestionUsuarios } from '../middlewares/requierePermisoGestionUsuarios';
import { registrarProfesionalController } from '../controllers/profesionalController';
import { registrarProfesionalSchema } from '../validations/profesionalValidation';

const router = Router();

router.post(
  '/registro',
  authenticate,
  requierePermisoGestionUsuarios,
  validate(registrarProfesionalSchema),
  registrarProfesionalController
);

export default router;