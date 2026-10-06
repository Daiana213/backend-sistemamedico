import { Router } from 'express';
import * as consultaController from '../controllers/consultaController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.post('/', consultaController.registrarConsulta);

export default router;
