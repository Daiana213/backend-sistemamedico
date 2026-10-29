import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import {
  estudioMedicoSchema,
  estudioAdminCrearSchema,
  estudioActualizarSchema,
  cambiarEstadoEstudioSchema,
} from '../validations/estudioValidation';
import * as estudioController from '../controllers/estudioController';

const router = Router();

router.use(authenticate);

// Estado de integración con PACS (diagnóstico y healthcheck)
router.get('/pacs/estado', estudioController.consultarEstadoPacs);

// Panel de administración de estudios médicos (ADMINISTRATIVO)
router.get(
  '/admin',
  authorize('ADMINISTRATIVO'),
  estudioController.listarEstudiosAdmin
);

router.get(
  '/pacientes-busqueda',
  authorize('ADMINISTRATIVO'),
  estudioController.buscarPacientesAdmin
);

router.post(
  '/admin',
  authorize('ADMINISTRATIVO'),
  validate(estudioAdminCrearSchema),
  estudioController.crearEstudioAdmin
);

// Gestión y carga de estudios de un paciente por profesional o administrativo
router.get(
  '/paciente/:idPaciente',
  authorize('PROFESIONAL', 'ADMINISTRATIVO'),
  estudioController.listarEstudiosPacienteProfesional
);

router.post(
  '/paciente/:idPaciente',
  authorize('PROFESIONAL', 'ADMINISTRATIVO'),
  validate(estudioMedicoSchema),
  estudioController.crearEstudioParaPaciente
);

// Gestión de "Mis estudios" por parte del paciente autenticado
router.get('/', authorize('PACIENTE'), estudioController.listarMisEstudios);

router.post(
  '/',
  authorize('PACIENTE'),
  validate(estudioMedicoSchema),
  estudioController.crearEstudio
);

// Consulta de metadatos PACS para un estudio registrado
router.get('/:idEstudio/pacs', estudioController.verificarEstudioPacs);

// Descarga o visualización de informe médico en formato PDF (HU21)
router.get('/:idEstudio/informe', estudioController.descargarInformePdf);
router.get('/:idEstudio/pdf', estudioController.descargarInformePdf);

// Obtener detalle de estudio
router.get('/:idEstudio', estudioController.obtenerMiEstudio);

// Modificación y estado de estudio médico
router.put(
  '/:idEstudio',
  validate(estudioActualizarSchema),
  estudioController.editarEstudio
);

router.patch(
  '/:idEstudio/estado',
  authorize('ADMINISTRATIVO'),
  validate(cambiarEstadoEstudioSchema),
  estudioController.cambiarEstadoEstudioAdmin
);

router.patch(
  '/:idEstudio',
  validate(estudioActualizarSchema),
  estudioController.editarEstudio
);

// Baja lógica de estudio
router.delete('/:idEstudio', estudioController.eliminarEstudio);

export default router;
