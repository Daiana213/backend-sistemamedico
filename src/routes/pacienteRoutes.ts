import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/authenticate';
import {
  registrarPacienteSchema,
  actualizarPerfilPacienteSchema,
} from '../validations/pacienteValidation';
import * as pacienteController from '../controllers/pacienteController';
import * as antecedentesController from '../controllers/antecedentesController';
import * as estudioController from '../controllers/estudioController';
import { uploadDocumentoResponsable } from '../middlewares/upload';
import { reenviarDoc, listarMisMenores } from '../controllers/menorController';
import { antecedentesMedicosSchema } from '../validations/antecedentesValidation';
import { estudioMedicoSchema } from '../validations/estudioValidation';
import { authorize } from '../middlewares/authorize';

const router = Router();

// Registro de paciente (con documento opcional si es menor)
router.post(
  '/registro',
  uploadDocumentoResponsable.single('documento'),
  validate(registrarPacienteSchema),
  pacienteController.registrar
);

// Obtener datos del perfil del paciente autenticado
router.get(
  '/perfil',
  authenticate,
  pacienteController.obtenerPerfil
);

// Buscar paciente por DNI (Profesionales / Administrativos)
router.get(
  '/buscar',
  authenticate,
  authorize('PROFESIONAL', 'ADMINISTRATIVO'),
  pacienteController.buscarPorDni
);

// Actualizar datos del perfil del paciente (para completar email, sexo, obra social/plan)
router.put(
  '/perfil',
  authenticate,
  validate(actualizarPerfilPacienteSchema),
  pacienteController.actualizarPerfil
);

// Reenvío de documentación para menores observados/rechazados (requiere paciente responsable autenticado)
router.patch(
  '/menores/:id/reenviar-documentacion',
  authenticate,
  uploadDocumentoResponsable.single('documento'),
  reenviarDoc
);

// Obtener menores a cargo del paciente adulto autenticado
router.get(
  '/mis-menores',
  authenticate,
  authorize('PACIENTE'),
  listarMisMenores
);

// HU17: Obtener antecedentes médicos
router.get(
  '/me/antecedentes',
  authenticate,
  authorize('PACIENTE'),
  antecedentesController.getAntecedentes
);

// HU17: Crear o actualizar antecedentes médicos
router.put(
  '/me/antecedentes',
  authenticate,
  authorize('PACIENTE'),
  validate(antecedentesMedicosSchema),
  antecedentesController.upsertAntecedentes
);

// HU21: Gestión de códigos de estudios médicos del paciente ("Mis estudios")
router.get(
  '/me/estudios',
  authenticate,
  authorize('PACIENTE'),
  estudioController.listarMisEstudios
);

router.get(
  '/me/estudios/:idEstudio',
  authenticate,
  authorize('PACIENTE'),
  estudioController.obtenerMiEstudio
);

router.post(
  '/me/estudios',
  authenticate,
  validate(estudioMedicoSchema),
  estudioController.crearEstudio
);

router.put(
  '/me/estudios/:idEstudio',
  authenticate,
  validate(estudioMedicoSchema),
  estudioController.editarEstudio
);

router.patch(
  '/me/estudios/:idEstudio',
  authenticate,
  validate(estudioMedicoSchema),
  estudioController.editarEstudio
);

router.delete(
  '/me/estudios/:idEstudio',
  authenticate,
  estudioController.eliminarEstudio
);

// HU8 y HU21 Escenario 3: Consulta de Historia Clínica y estudios del paciente por el profesional con vínculo
router.get(
  '/:idPaciente/historia-clinica',
  authenticate,
  authorize('PROFESIONAL'),
  estudioController.obtenerHistoriaClinica
);

router.get(
  '/:idPaciente/estudios',
  authenticate,
  authorize('PROFESIONAL', 'ADMINISTRATIVO'),
  estudioController.listarEstudiosPacienteProfesional
);

router.post(
  '/:idPaciente/estudios',
  authenticate,
  authorize('PROFESIONAL', 'ADMINISTRATIVO'),
  validate(estudioMedicoSchema),
  estudioController.crearEstudioParaPaciente
);

export default router;
