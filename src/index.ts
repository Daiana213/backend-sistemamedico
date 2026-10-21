import 'dotenv/config';
import app from './app';
import { prisma } from './config/prisma';
import { asegurarReporteMensualAutomatico } from './services/reporteService';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);

    // HU18 Escenario 5: Verificar / ejecutar generación programada del reporte mensual cerrado
    asegurarReporteMensualAutomatico().catch((err) => {
      console.error('Aviso al ejecutar verificación de reporte mensual automático:', err);
    });
  });

  // Tarea programada cada 12 horas para generar automáticamente el reporte mensual al cierre del período
  const intervaloReporteMensual = setInterval(() => {
    asegurarReporteMensualAutomatico().catch((err) => {
      console.error('Aviso en tarea programada de reporte mensual:', err);
    });
  }, 12 * 60 * 60 * 1000);
  intervaloReporteMensual.unref();

  async function shutdown(signal: string) {
    console.log(`\n${signal} recibido. Cerrando servidor...`);
    clearInterval(intervaloReporteMensual);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Conexiones cerradas. Proceso finalizado.');
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

export default app;