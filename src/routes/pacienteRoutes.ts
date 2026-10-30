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

router.post(
  '/registro',
  uploadDocumentoResponsable.single('documento'),
  validate(registrarPacienteSchema),
  pacienteController.registrar
);

router.get(
  '/perfil',
  authenticate,
  pacienteController.obtenerPerfil
);

router.get(
  '/buscar',
  authenticate,
  authorize('PROFESIONAL', 'ADMINISTRATIVO'),
  pacienteController.buscarPorDni
);

router.put(
  '/perfil',
  authenticate,
  validate(actualizarPerfilPacienteSchema),
  pacienteController.actualizarPerfil
);

router.patch(
  '/perfil',
  authenticate,
  validate(actualizarPerfilPacienteSchema),
  pacienteController.actualizarPerfil
);

router.patch(
  '/menores/:id/reenviar-documentacion',
  authenticate,
  uploadDocumentoResponsable.single('documento'),
  reenviarDoc
);

router.get(
  '/mis-menores',
  authenticate,
  authorize('PACIENTE'),
  listarMisMenores
);

router.get(
  '/me/antecedentes',
  authenticate,
  authorize('PACIENTE'),
  antecedentesController.getAntecedentes
);

router.put(
  '/me/antecedentes',
  authenticate,
  authorize('PACIENTE'),
  validate(antecedentesMedicosSchema),
  antecedentesController.upsertAntecedentes
);

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
