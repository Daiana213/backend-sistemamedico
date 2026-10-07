import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { crearTurnoSchema } from '../validations/turnoValidation';
import * as turnoController from '../controllers/turnoController';

const router = Router();

// Crear / Solicitar nuevo turno médico (requiere perfil completo con email, sexo y obra social/plan)
router.post(
  '/',
  authenticate,
  validate(crearTurnoSchema),
  turnoController.crear
);

// Listar turnos del usuario autenticado
router.get(
  '/',
  authenticate,
  turnoController.listar
);

// Cancelar un turno
router.post(
  '/:id/cancelar',
  authenticate,
  turnoController.cancelar
);

// Reprogramar un turno
router.post(
  '/:id/reprogramar',
  authenticate,
  // aquí se podría agregar un validate para fechaHora
  turnoController.reprogramar
);

export default router;
