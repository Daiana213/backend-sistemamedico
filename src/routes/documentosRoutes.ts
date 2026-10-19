import { Router } from 'express';
import { obtenerDocumentoPorId } from '../controllers/documentosController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.get('/:idDocumento', authenticate, obtenerDocumentoPorId);

export default router;

