import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { requierePermisoGestionUsuarios } from '../middlewares/requierePermisoGestionUsuarios';
import { registrarProfesionalController } from '../controllers/profesionalController';
import { registrarProfesionalSchema } from '../validations/profesionalValidation';
import { authorize } from '../middlewares/authorize';
import { obtenerMiAgenda } from '../controllers/profesionalAgendaController';

const router = Router();

router.post(
  '/registro',
  authenticate,
  requierePermisoGestionUsuarios,
  validate(registrarProfesionalSchema),
  registrarProfesionalController
);

// HU16: Obtener la agenda propia del profesional autenticado
router.get(
  '/me/turnos',
  authenticate,
  authorize('PROFESIONAL'),
  obtenerMiAgenda
);

export default router;