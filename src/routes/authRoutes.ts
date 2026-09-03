import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import {
  loginSchema,
  seleccionarRolSchema,
  refreshSchema,
  logoutSchema,
  solicitarRecuperacionSchema,
  restablecerPasswordSchema,
  cambiarPasswordSchema,
} from '../validations/authValidation';
import * as authController from '../controllers/authController';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/seleccionar-rol', validate(seleccionarRolSchema), authController.seleccionarRol);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', validate(logoutSchema), authController.logout);
router.post('/solicitar-recuperacion', validate(solicitarRecuperacionSchema), authController.solicitarRecuperacionPassword);
router.post('/restablecer-password', validate(restablecerPasswordSchema), authController.restablecerPassword);
router.post('/cambiar-password', authenticate, validate(cambiarPasswordSchema), authController.cambiarPassword);

export default router;