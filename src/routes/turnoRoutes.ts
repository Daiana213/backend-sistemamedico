import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { crearTurnoSchema } from '../validations/turnoValidation';
import { simularCoberturaTurnoSchema } from '../validations/obraSocialValidation';
import * as turnoController from '../controllers/turnoController';
import { simularCoberturaController } from '../controllers/obraSocialController';

const router = Router();

// Simulación previa de cobertura de obra social y requisitos para la consulta médica
router.get(
  '/simular-cobertura',
  authenticate,
  simularCoberturaController
);

router.post(
  '/simular-cobertura',
  authenticate,
  validate(simularCoberturaTurnoSchema),
  simularCoberturaController
);

// HU23: Trigger administrativo o cron para procesar recordatorios automáticos 24 hs
router.post(
  '/recordatorios/procesar',
  authenticate,
  turnoController.procesarRecordatorios
);

// Crear / Solicitar nuevo turno médico (requiere perfil completo con email, sexo y obra social/plan)
router.post(
  '/',
  authenticate,
  validate(crearTurnoSchema, { customMessage: 'Por favor, complete todos los campos obligatorios para continuar.' }),
  turnoController.crear
);

// Listar turnos del usuario autenticado
router.get(
  '/',
  authenticate,
  turnoController.listar
);

// Recepción de pacientes: Registro de llegada en sala de espera (Administrativo)
router.patch(
  '/:id/recepcion',
  authenticate,
  turnoController.registrarRecepcion
);

router.post(
  '/:id/recepcion',
  authenticate,
  turnoController.registrarRecepcion
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
  turnoController.reprogramar
);

// HU12: Reprogramación administrativa de turnos (PUT /:id y PATCH /:id/reprogramar-admin)
router.put(
  '/:id',
  authenticate,
  turnoController.reprogramarAdmin
);

router.patch(
  '/:id/reprogramar-admin',
  authenticate,
  turnoController.reprogramarAdmin
);

// HU12: Cancelación administrativa de turnos (DELETE /:id y PATCH /:id/cancelar-admin)
router.delete(
  '/:id',
  authenticate,
  turnoController.cancelarAdmin
);

router.patch(
  '/:id/cancelar-admin',
  authenticate,
  turnoController.cancelarAdmin
);

export default router;
