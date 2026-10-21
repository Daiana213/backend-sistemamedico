import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requierePermisoGestionUsuarios } from '../middlewares/requierePermisoGestionUsuarios';
import * as reporteController from '../controllers/reporteController';

const router = Router();

// Todas las rutas de HU18 requieren administrativo autenticado con permiso de gestión de usuarios (Escenarios 1 y 7)
router.use(authenticate, requierePermisoGestionUsuarios);

// Escenarios 1, 2, 3 y 4: Panel de métricas y gráficos estadísticos
router.get('/panel', reporteController.obtenerPanel);
router.get('/metricas', reporteController.obtenerPanel);

// Escenario 5: Historial de reportes generados
router.get('/historial', reporteController.listarReportes);
router.get('/generados', reporteController.listarReportes);

// Escenario 6: Exportación directa del período filtrado en PDF o Excel (?formato=pdf|excel)
router.get('/exportar', reporteController.exportarReporteActual);

// Raíz (/reportes o /metricas): devuelve el panel de métricas actualizado junto con los reportes disponibles
router.get('/', reporteController.obtenerPanelYReportes);

// Escenario 5: Generación manual y automática programada de reportes con registro en auditoría
router.post('/generar', reporteController.generarReporte);
router.post('/generar-automatico', reporteController.ejecutarGeneracionAutomatica);

// Escenarios 5 y 6: Consulta de un reporte específico y exportación por ID
router.get('/:id', reporteController.obtenerReporte);
router.get('/:id/exportar', reporteController.exportarReporteGuardado);

export default router;
