import 'dotenv/config';
import app from './app';
import { prisma } from './config/prisma';
import { asegurarReporteMensualAutomatico } from './services/reporteService';
import { iniciarWorkerRecordatorios } from './services/recordatorioService';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);

    // HU18 Escenario 5: Verificar / ejecutar generación programada del reporte mensual cerrado
    asegurarReporteMensualAutomatico().catch((err) => {
      console.error('Aviso al ejecutar verificación de reporte mensual automático:', err);
    });

    // HU23: Iniciar worker de recordatorios automáticos de turnos (24 hs antes)
    iniciarWorkerRecordatorios(30 * 60 * 1000);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[ERROR] El puerto ${PORT} ya esta en uso por otro proceso.`);
      console.error(`   Cierra el proceso que ocupa el puerto ${PORT} o define otro PORT en .env\n`);
    } else {
      console.error('\n[ERROR] Error en el servidor HTTP:', err);
    }
    process.exit(1);
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
