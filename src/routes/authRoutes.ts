import { Router } from 'express';
import { validate } from '../middlewares/validate';
import {
  loginSchema,
  seleccionarRolSchema,
  refreshSchema,
  logoutSchema,
  solicitarRecuperacionSchema,
  restablecerPasswordSchema,
} from '../validations/authValidation';
import * as authController from '../controllers/authController';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/seleccionar-rol', validate(seleccionarRolSchema), authController.seleccionarRol);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', validate(logoutSchema), authController.logout);
router.post('/solicitar-recuperacion', validate(solicitarRecuperacionSchema), authController.solicitarRecuperacionPassword);
router.post('/restablecer-password', validate(restablecerPasswordSchema), authController.restablecerPassword);

export default router;