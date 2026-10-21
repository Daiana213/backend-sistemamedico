import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import {
  filtroMetricasQuerySchema,
  generarReporteBodySchema,
} from '../validations/reporteValidation';
import * as reporteService from '../services/reporteService';

function parsearFiltrosDesdeQuery(req: Request): reporteService.FiltrosMetricas {
  const resultado = filtroMetricasQuerySchema.safeParse({
    periodo: req.query.periodo,
    fechaInicio: req.query.fechaInicio,
    fechaFin: req.query.fechaFin,
    idEspecialidad: req.query.idEspecialidad,
    idProfesional: req.query.idProfesional,
  });

  if (!resultado.success) {
    const primerMensaje =
      resultado.error.issues[0]?.message || 'Parámetros de filtro de período inválidos.';
    throw new AppError(primerMensaje, 400);
  }

  return resultado.data;
}

/**
 * Escenarios 1, 2, 3 y 4: Obtener el panel de métricas y gráficos estadísticos.
 */
export const obtenerPanel = asyncHandler(async (req: Request, res: Response) => {
  const filtros = parsearFiltrosDesdeQuery(req);
  const panel = await reporteService.obtenerPanelMetricas(filtros);
  res.status(200).json(panel);
});

/**
 * Escenarios 1 a 5 unificados en raíz de /reportes: devuelve el panel de métricas actualizado
 * junto con el listado de reportes automáticos/manuales generados.
 */
export const obtenerPanelYReportes = asyncHandler(async (req: Request, res: Response) => {
  const filtros = parsearFiltrosDesdeQuery(req);
  const [panel, reportes] = await Promise.all([
    reporteService.obtenerPanelMetricas(filtros),
    reporteService.listarReportesDisponibles(),
  ]);

  res.status(200).json({
    ...panel,
    reportes,
  });
});

/**
 * Escenario 5: Listar reportes generados disponibles para su consulta.
 */
export const listarReportes = asyncHandler(async (req: Request, res: Response) => {
  const reportes = await reporteService.listarReportesDisponibles();
  res.status(200).json({
    total: reportes.length,
    reportes,
  });
});

/**
 * Escenario 5: Consultar el detalle completo de un reporte generado por su ID.
 */
export const obtenerReporte = asyncHandler(async (req: Request, res: Response) => {
  const idReporte = parseInt(req.params.id as string, 10);
  if (isNaN(idReporte)) {
    throw new AppError('ID de reporte inválido.', 400);
  }

  const reporte = await reporteService.obtenerReportePorId(idReporte);
  res.status(200).json(reporte);
});

/**
 * Escenario 5: Generar y guardar un reporte en el sistema registrándolo en el log de auditoría.
 */
export const generarReporte = asyncHandler(async (req: Request, res: Response) => {
  const validacion = generarReporteBodySchema.safeParse(req.body || {});
  if (!validacion.success) {
    const primerMensaje =
      validacion.error.issues[0]?.message || 'Datos de generación de reporte inválidos.';
    throw new AppError(primerMensaje, 400);
  }

  const esAutomatico = Boolean(req.body?.esAutomatico);
  const reporte = await reporteService.generarYGuardarReporte(validacion.data, {
    idUsuario: req.usuario?.idUsuario,
    ip: req.ip,
    esAutomatico,
  });

  res.status(201).json({
    mensaje: 'Reporte generado y registrado correctamente.',
    reporte,
  });
});

/**
 * Escenario 5: Ejecución de la generación automática mensual programada.
 */
export const ejecutarGeneracionAutomatica = asyncHandler(async (req: Request, res: Response) => {
  const nuevoReporte = await reporteService.asegurarReporteMensualAutomatico();
  if (!nuevoReporte) {
    const reportes = await reporteService.listarReportesDisponibles();
    res.status(200).json({
      mensaje: 'El reporte automático del último período mensual cerrado ya se encontraba generado.',
      reportesRecientes: reportes.slice(0, 5),
    });
    return;
  }

  res.status(201).json({
    mensaje: 'Reporte mensual automático generado y registrado en auditoría.',
    reporte: nuevoReporte,
  });
});

function enviarArchivoExportado(
  res: Response,
  formatoRaw: string,
  panel: Awaited<ReturnType<typeof reporteService.obtenerPanelMetricas>>
) {
  const formato = (formatoRaw || 'pdf').toLowerCase();
  const sufijoFecha = `${panel.periodo.fechaInicio}_a_${panel.periodo.fechaFin}`;

  if (formato === 'pdf') {
    const bufferPdf = reporteService.generarArchivoPdfReporte(panel);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte_metricas_${sufijoFecha}.pdf"`
    );
    res.status(200).send(bufferPdf);
    return;
  }

  if (formato === 'excel' || formato === 'xlsx' || formato === 'xls') {
    const bufferExcel = reporteService.generarArchivoExcelReporte(panel);
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte_metricas_${sufijoFecha}.xls"`
    );
    res.status(200).send(bufferExcel);
    return;
  }

  throw new AppError('Formato de exportación inválido. Formatos permitidos: pdf, excel.', 400);
}

/**
 * Escenario 6: Exportar el reporte del período filtrado actual en formato PDF o Excel.
 */
export const exportarReporteActual = asyncHandler(async (req: Request, res: Response) => {
  const filtros = parsearFiltrosDesdeQuery(req);
  const formato = (req.query.formato as string) || 'pdf';
  const panel = await reporteService.obtenerPanelMetricas(filtros);

  enviarArchivoExportado(res, formato, panel);
});

/**
 * Escenario 6: Exportar un reporte previamente generado por su ID en formato PDF o Excel.
 */
export const exportarReporteGuardado = asyncHandler(async (req: Request, res: Response) => {
  const idReporte = parseInt(req.params.id as string, 10);
  if (isNaN(idReporte)) {
    throw new AppError('ID de reporte inválido.', 400);
  }

  const formato = (req.query.formato as string) || 'pdf';
  const reporte = await reporteService.obtenerReportePorId(idReporte);

  if (!reporte.metricas) {
    throw new AppError('El reporte seleccionado no contiene datos de métricas exportables.', 400);
  }

  enviarArchivoExportado(res, formato, reporte.metricas);
});
