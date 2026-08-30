import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middlewares/errorHandler';
import { notFoundHandler } from './middlewares/notFoundHandler';
import authRoutes from './routes/authRoutes';
import pacienteRoutes from './routes/pacienteRoutes';
import administrativoRoutes from './routes/administrativoRoutes';
import profesionalRoutes from './routes/profesionalRoutes';
import menorRoutes from './routes/menorRoutes';
import obraSocialRoutes from './routes/obraSocialRoutes';

const app: Application = express();

// Cabeceras de seguridad HTTP por default
app.use(helmet());

// CORS: solo el origen del frontend puede llamar a esta API
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Parseo de JSON en el body de los requests
app.use(express.json());

// Healthcheck simple — confirma que el server responde
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ---- Rutas del sistema: se van agregando a medida que implementemos cada HU ----
app.use('/auth', authRoutes);
app.use('/pacientes', pacienteRoutes);
app.use('/administrativos', administrativoRoutes);
app.use('/profesionales', profesionalRoutes);
app.use('/', menorRoutes);
app.use('/', obraSocialRoutes);

// 404 para rutas no definidas — SIEMPRE después de todas las rutas
app.use(notFoundHandler);

// Manejador de errores central — SIEMPRE el último middleware
app.use(errorHandler);

export default app;