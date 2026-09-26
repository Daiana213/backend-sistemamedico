import { Router } from 'express';
import * as obraSocialController from '../controllers/obraSocialController';

const router = Router();

router.get('/', obraSocialController.listarObrasSociales);
router.get('/:idObraSocial/planes', obraSocialController.listarPlanesPorObraSocial);

export default router;
