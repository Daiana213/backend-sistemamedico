import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { registrarPacienteSchema } from '../validations/pacienteValidation';
import * as pacienteController from '../controllers/pacienteController';
import { uploadDocumentoResponsable } from '../middlewares/upload';


const router = Router();

router.post('/registro',
    uploadDocumentoResponsable.single('documento'),
    validate(registrarPacienteSchema), 
    pacienteController.registrar
);

export default router;