import express, { Application, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middlewares/errorHandler';
import { notFoundHandler } from './middlewares/notFoundHandler';
import { setupSwagger } from './config/swagger';

import authRoutes from './routes/authRoutes';
import pacienteRoutes from './routes/pacienteRoutes';
import administrativoRoutes from './routes/administrativoRoutes';
import profesionalRoutes from './routes/profesionalRoutes';
import especialidadRoutes from './routes/especialidadRoutes';
import obraSocialRoutes from './routes/obraSocialRoutes';
import documentosRoutes from './routes/documentosRoutes';
import turnoRoutes from './routes/turnoRoutes';
import consultaRoutes from './routes/consultaRoutes';

const app: Application = express();


// Cabeceras de seguridad HTTP por default (deshabilitando CSP estricto para permitir Swagger UI)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// CORS: Permitir frontend local y en producción
const allowedOrigins = [
  'http://localhost:5173',
  'https://frontend-sistemamedico.onrender.com'
];

if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Parseo de JSON en el body de los requests
app.use(express.json());

// Documentación interactiva de la API con OpenAPI / Swagger UI
setupSwagger(app);

// Healthcheck simple — confirma que el server responde
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ---- Router unificado de la API ----
const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/pacientes', pacienteRoutes);
apiRouter.use('/administrativos', administrativoRoutes);
apiRouter.use('/profesionales', profesionalRoutes);
apiRouter.use('/especialidades', especialidadRoutes);
apiRouter.use('/obras-sociales', obraSocialRoutes);
apiRouter.use('/documentos', documentosRoutes);
apiRouter.use('/turnos', turnoRoutes);
apiRouter.use('/consultas', consultaRoutes);

// Healthcheck dentro del prefijo versionado
apiRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Montaje con prefijo versionado /api/v1, prefijo /api y soporte retroactivo en raíz /
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);
app.use('/', apiRouter);

// 404 para rutas no definidas — SIEMPRE después de todas las rutas
app.use(notFoundHandler);

// Manejador de errores central — SIEMPRE el último middleware
app.use(errorHandler);

export default app;