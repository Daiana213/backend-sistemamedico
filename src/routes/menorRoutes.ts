import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requiereAdminActivo } from '../middlewares/requiereAdminActivo';
import { uploadDocumentoResponsable  } from '../middlewares/upload';
import {
  listarMenores,
  aprobarMenor,
  rechazarMenor,
  reenviarDoc,
} from '../controllers/menorController';

const router = Router();

// Rutas de administrativo — requieren autenticación + permiso
router.get(
  '/administrativos/menores-pendientes',
  authenticate,
  requiereAdminActivo,
  listarMenores
);

router.patch(
  '/administrativos/menores/:id/aprobar',
  authenticate,
  requiereAdminActivo,
  aprobarMenor
);

router.patch(
  '/administrativos/menores/:id/rechazar',
  authenticate,
  requiereAdminActivo,
  rechazarMenor
);

// Ruta de paciente responsable — solo autenticación
router.patch(
  '/pacientes/menores/:id/reenviar-documentacion',
  authenticate,
  uploadDocumentoResponsable.single('documento'),
  reenviarDoc
);

export default router;