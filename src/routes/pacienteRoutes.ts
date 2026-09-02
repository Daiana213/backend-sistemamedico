import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { registrarPacienteSchema } from '../validations/pacienteValidation';
import * as pacienteController from '../controllers/pacienteController';

const router = Router();

router.post('/registro', validate(registrarPacienteSchema), pacienteController.registrar);

export default router;