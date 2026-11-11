import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import * as turnoService from '../services/turnoService';

export const crear = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión para solicitar un turno.', 401);
  }

  const resultado = await turnoService.crearTurno(req.body, req.usuario, req.ip);
  res.status(201).json(resultado);
});

export const crearTurnoPorProfesional = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado.', 401);
  }

  const { idPaciente, fechaHora } = req.body;

  if (!idPaciente || !fechaHora) {
    throw new AppError('Debe especificar idPaciente y fechaHora.', 400);
  }

  const idPacienteNumber = parseInt(idPaciente, 10);
  if (isNaN(idPacienteNumber)) {
    throw new AppError('ID de paciente inválido', 400);
  }

  const resultado = await turnoService.crearTurnoPorProfesional(
    { idPaciente: idPacienteNumber, fechaHora },
    req.usuario
  );
  res.status(201).json(resultado);
});

export const listar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión para ver los turnos.', 401);
  }

  const resultado = await turnoService.listarTurnos(req.usuario);
  res.status(200).json(resultado);
});

export const cancelar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado.', 401);
  }
  const idTurno = parseInt(req.params.id as string, 10);
  if (isNaN(idTurno)) {
    throw new AppError('ID de turno inválido', 400);
  }

  const motivoCancelacion = req.body?.motivoCancelacion;
  const resultado = await turnoService.cancelarTurno(idTurno, req.usuario);
  res.status(200).json(resultado);
});

export const reprogramar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado.', 401);
  }
  const idTurno = parseInt(req.params.id as string, 10);
  if (isNaN(idTurno)) {
    throw new AppError('ID de turno inválido', 400);
  }
  
  const fechaHora = req.body.nuevaFechaHora || req.body.fechaHora;
  if (!fechaHora) {
    throw new AppError('Se requiere la nueva fechaHora', 400);
  }

  const nuevaFecha = new Date(fechaHora);
  if (isNaN(nuevaFecha.getTime())) {
    throw new AppError('Formato de fechaHora inválido', 400);
  }

  const resultado = await turnoService.reprogramarTurno(idTurno, nuevaFecha, req.usuario);
  res.status(200).json(resultado);
});

export const cancelarAdmin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado.', 401);
  }
  const idTurno = parseInt(req.params.id as string, 10);
  if (isNaN(idTurno)) {
    throw new AppError('ID de turno inválido', 400);
  }

  const motivoCancelacion = req.body?.motivoCancelacion;
  const resultado = await turnoService.cancelarTurnoAdmin(idTurno, req.usuario, motivoCancelacion, req.ip);
  res.status(200).json(resultado);
});

export const reprogramarAdmin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado.', 401);
  }
  const idTurno = parseInt(req.params.id as string, 10);
  if (isNaN(idTurno)) {
    throw new AppError('ID de turno inválido', 400);
  }

  const fechaHora = req.body.nuevaFechaHora || req.body.fechaHora;
  if (!fechaHora) {
    throw new AppError('Se requiere la nueva fechaHora', 400);
  }

  const nuevaFecha = new Date(fechaHora);
  if (isNaN(nuevaFecha.getTime())) {
    throw new AppError('Formato de fechaHora inválido', 400);
  }

  const motivo = req.body?.motivo;
  const resultado = await turnoService.reprogramarTurnoAdmin(idTurno, nuevaFecha, req.usuario, motivo, req.ip);
  res.status(200).json(resultado);
});


import * as recordatorioService from '../services/recordatorioService';

export const registrarRecepcion = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado.', 401);
  }
  const idTurno = parseInt(req.params.id as string, 10);
  if (isNaN(idTurno)) {
    throw new AppError('ID de turno inválido', 400);
  }

  const resultado = await turnoService.registrarRecepcionTurno(idTurno, req.usuario, req.ip, req.body);
  res.status(200).json(resultado);
});

export const procesarRecordatorios = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado.', 401);
  }
  if (req.usuario.rolActivo !== 'ADMINISTRATIVO') {
    throw new AppError('Permiso denegado.', 403);
  }

  const resultado = await recordatorioService.procesarRecordatoriosProximos(req.ip);
  res.status(200).json({
    mensaje: 'Procesamiento de recordatorios 24 hs ejecutado.',
    ...resultado,
  });
});

export const confirmarAsistencia = asyncHandler(async (req: Request, res: Response) => {
  const idTurno = parseInt(req.params.id as string, 10);
  if (isNaN(idTurno) || idTurno <= 0) {
    throw new AppError('ID de turno inválido', 400);
  }

  const token = (req.query.token as string | undefined) || (req.body?.token as string | undefined);
  const resultado = await turnoService.confirmarAsistenciaTurno(idTurno, token, req.ip);

  const acceptHeader = req.headers.accept || '';
  if (req.method === 'GET' || acceptHeader.includes('text/html')) {
    const portalUrl = (process.env.FRONTEND_URL || 'https://frontend-sistemamedico.vercel.app').replace(/\/$/, '');
    const colorBorde = resultado.confirmado ? '#22a55c' : '#dc2626';
    const colorFondo = resultado.confirmado ? '#f0fdf4' : '#fef2f2';
    const colorTexto = resultado.confirmado ? '#166534' : '#991b1b';
    const titulo = resultado.confirmado ? 'Asistencia confirmada' : 'No se pudo confirmar el turno';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titulo} - Sanatorio Antonia</title>
</head>
<body style="margin:0;padding:32px 16px;background-color:#f3f4f6;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <div style="max-width:540px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(17,24,39,0.08);">
    <div style="background-color:#166534;padding:24px 32px;color:#ffffff;">
      <div style="font-size:20px;font-weight:700;">+ Sanatorio Antonia</div>
      <div style="font-size:13px;opacity:0.85;margin-top:4px;">Confirmación de Asistencia a Turno Médico</div>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${titulo}</h1>
      <p style="margin:0 0 20px;line-height:1.6;color:#374151;">${resultado.mensaje}</p>
      <div style="margin:20px 0;padding:18px;background-color:${colorFondo};border-left:4px solid ${colorBorde};border-radius:10px;line-height:1.8;color:${colorTexto};">
        <div><strong>Paciente:</strong> ${resultado.detalle.paciente}</div>
        <div><strong>Profesional:</strong> Dr./Dra. ${resultado.detalle.profesional}</div>
        <div><strong>Fecha y hora:</strong> ${resultado.detalle.fechaFormateada}</div>
        <div><strong>Estado del turno:</strong> ${resultado.detalle.estado}</div>
      </div>
      <div style="text-align:center;margin-top:28px;">
        <a href="${portalUrl}" style="display:inline-block;padding:13px 28px;background-color:#166534;color:#ffffff;text-decoration:none;font-weight:700;border-radius:999px;font-size:14px;">
          Ir al portal de Sanatorio Antonia
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;

    res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
    return;
  }

  res.status(200).json(resultado);
});
