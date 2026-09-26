import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/authenticate';
import { registrarPacienteSchema } from '../validations/pacienteValidation';
import * as pacienteController from '../controllers/pacienteController';
import { uploadDocumentoResponsable } from '../middlewares/upload';
import { reenviarDoc } from '../controllers/menorController';

const router = Router();

// Registro de paciente (con documento opcional si es menor)
router.post(
  '/registro',
  uploadDocumentoResponsable.single('documento'),
  validate(registrarPacienteSchema),
  pacienteController.registrar
);

// Reenvío de documentación para menores observados/rechazados (requiere paciente responsable autenticado)
router.patch(
  '/menores/:id/reenviar-documentacion',
  authenticate,
  uploadDocumentoResponsable.single('documento'),
  reenviarDoc
);

export default router;