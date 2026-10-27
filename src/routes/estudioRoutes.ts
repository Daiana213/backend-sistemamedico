import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { estudioMedicoSchema } from '../validations/estudioValidation';
import * as estudioController from '../controllers/estudioController';

const router = Router();

router.use(authenticate);

// Estado de integración con PACS (diagnóstico y healthcheck)
router.get('/pacs/estado', estudioController.consultarEstadoPacs);

// Visualización solo lectura para profesional con vínculo con el paciente (HU21 Escenario 3 / HU8 Escenario 4)
router.get(
  '/paciente/:idPaciente',
  authorize('PROFESIONAL'),
  estudioController.listarEstudiosPacienteProfesional
);

// Gestión de "Mis estudios" por parte del paciente autenticado (HU21 Escenarios 1, 2 y 3)
router.get('/', authorize('PACIENTE'), estudioController.listarMisEstudios);

// Consulta de metadatos PACS para un estudio registrado
router.get('/:idEstudio/pacs', estudioController.verificarEstudioPacs);

// Descarga o visualización de informe médico en formato PDF (HU21)
router.get('/:idEstudio/informe', estudioController.descargarInformePdf);
router.get('/:idEstudio/pdf', estudioController.descargarInformePdf);

router.get('/:idEstudio', authorize('PACIENTE'), estudioController.obtenerMiEstudio);

router.post(
  '/',
  validate(estudioMedicoSchema),
  estudioController.crearEstudio
);

router.put(
  '/:idEstudio',
  validate(estudioMedicoSchema),
  estudioController.editarEstudio
);

router.patch(
  '/:idEstudio',
  validate(estudioMedicoSchema),
  estudioController.editarEstudio
);

router.delete('/:idEstudio', estudioController.eliminarEstudio);

export default router;
