import { Router } from 'express';
import { obtenerDocumentoPorId } from '../controllers/documentosController';
import { authenticate } from '../middlewares/authenticate';
import { requiereAdminActivo } from '../middlewares/requiereAdminActivo';

const router = Router();

router.get('/:idDocumento', authenticate, requiereAdminActivo, obtenerDocumentoPorId);

export default router;
