import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { listarEspecialidadesController } from '../controllers/especialidadController';

const router = Router();

// Listado de especialidades activas (requiere autenticación)
router.get('/', authenticate, listarEspecialidadesController);

export default router;
