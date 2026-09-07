import { Router } from 'express';
import * as obraSocialController from '../controllers/obraSocialController';

const router = Router();

router.get('/obras-sociales', obraSocialController.listarObrasSociales);
router.get('/obras-sociales/:idObraSocial/planes', obraSocialController.listarPlanesPorObraSocial);

export default router;
