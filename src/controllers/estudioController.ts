import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import * as estudioService from '../services/estudioService';
import * as pacsService from '../services/pacsService';
import { generarHtmlVisorDicom } from '../utils/visorDicomHtml';

function parsearId(valor: string | string[] | undefined, nombreCampo: string): number {
  const raw = Array.isArray(valor) ? valor[0] : valor;
  const id = Number.parseInt(raw || '', 10);
  if (Number.isNaN(id)) {
    throw new AppError(`ID de ${nombreCampo} inválido.`, 400);
  }
  return id;
}

// HU21: Listar "Mis estudios" del paciente autenticado
export const listarMisEstudios = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }
  const estudios = await estudioService.listarMisEstudios(req.usuario.idUsuario);
  res.status(200).json(estudios);
});

// HU21 - Escenario 3: Obtener detalle de un estudio del paciente autenticado
export const obtenerMiEstudio = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }
  const idEstudio = parsearId(req.params.idEstudio || req.params.id, 'estudio');
  const estudio = await estudioService.obtenerMiEstudioPorId(req.usuario.idUsuario, idEstudio);
  res.status(200).json(estudio);
});

// HU21 - Escenario 1: Alta de código de estudio médico por el paciente
export const crearEstudio = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }
  if (req.usuario.rolActivo !== 'PACIENTE') {
    throw new AppError('Solo el paciente puede utilizar este endpoint de carga personal.', 403);
  }
  const resultado = await estudioService.crearEstudio(
    req.usuario.idUsuario,
    req.body,
    req.ip
  );
  res.status(201).json(resultado);
});

// Carga de estudio para un paciente específico por Profesional o Administrativo
export const crearEstudioParaPaciente = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }
  const idPaciente = parsearId(req.params.idPaciente || req.params.id, 'paciente');
  const resultado = await estudioService.crearEstudioParaPaciente(
    req.usuario.idUsuario,
    req.usuario.rolActivo,
    idPaciente,
    req.body,
    req.ip
  );
  res.status(201).json(resultado);
});

// Alta administrativa de estudio médico (con idPaciente o dniPaciente)
export const crearEstudioAdmin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }
  const resultado = await estudioService.crearEstudioAdmin(
    req.usuario.idUsuario,
    req.body,
    req.ip
  );
  res.status(201).json(resultado);
});

// Listado de todos los estudios para administración con filtros
export const listarEstudiosAdmin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
  const idPaciente = req.query.idPaciente
    ? parsearId(req.query.idPaciente as string, 'paciente')
    : undefined;

  const estudios = await estudioService.listarTodosLosEstudiosAdmin({
    q,
    estado,
    idPaciente,
  });
  res.status(200).json(estudios);
});

// Búsqueda de pacientes para el modal de asignación de estudios en administración
export const buscarPacientesAdmin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const pacientes = await estudioService.buscarPacientesParaEstudio(q);
  res.status(200).json(pacientes);
});

// Edición de estudio médico por Paciente, Profesional o Administrativo
export const editarEstudio = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }
  const idEstudio = parsearId(req.params.idEstudio || req.params.id, 'estudio');
  const resultado = await estudioService.actualizarEstudioGenerico(
    req.usuario.idUsuario,
    req.usuario.rolActivo,
    idEstudio,
    req.body,
    req.ip
  );
  res.status(200).json(resultado);
});

// Eliminación (baja lógica) de estudio médico
export const eliminarEstudio = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }
  const idEstudio = parsearId(req.params.idEstudio || req.params.id, 'estudio');
  const resultado = await estudioService.eliminarEstudioGenerico(
    req.usuario.idUsuario,
    req.usuario.rolActivo,
    idEstudio,
    req.ip
  );
  res.status(200).json(resultado);
});

// Cambio de estado de estudio médico para administración
export const cambiarEstadoEstudioAdmin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }
  const idEstudio = parsearId(req.params.idEstudio || req.params.id, 'estudio');
  const estado = req.body.estado as 'ACTIVO' | 'INACTIVO';
  const resultado = await estudioService.cambiarEstadoEstudioAdmin(
    req.usuario.idUsuario,
    idEstudio,
    estado,
    req.ip
  );
  res.status(200).json(resultado);
});

// HU21 Escenario 3 / HU8 Escenario 4: Visualización de estudios del paciente por el profesional con vínculo
export const listarEstudiosPacienteProfesional = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.usuario) {
      throw new AppError('No autorizado. Debe iniciar sesión.', 401);
    }
    const idPaciente = parsearId(req.params.idPaciente || req.params.id, 'paciente');
    const resultado = await estudioService.listarEstudiosDePacienteParaProfesional(
      req.usuario.idUsuario,
      idPaciente
    );
    res.status(200).json(resultado);
  }
);

// HU8 + HU21: Obtener Historia Clínica completa del paciente (incluyendo estudios médicos)
export const obtenerHistoriaClinica = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }
  const idPaciente = parsearId(req.params.idPaciente || req.params.id, 'paciente');
  const resultado = await estudioService.obtenerHistoriaClinicaPaciente(
    req.usuario.idUsuario,
    idPaciente
  );
  res.status(200).json(resultado);
});

// HU21 Integración PACS: Consulta el estado general de conexión con Orthanc
export const consultarEstadoPacs = asyncHandler(async (_req: Request, res: Response) => {
  const estado = await pacsService.obtenerEstadoPacs();
  res.status(200).json(estado);
});

// HU21 Integración PACS: Consulta metadatos DICOM en Orthanc para un estudio específico
export const verificarEstudioPacs = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }
  const idEstudio = parsearId(req.params.idEstudio || req.params.id, 'estudio');
  const resultado = await estudioService.consultarEstadoEstudioEnPacs(
    req.usuario.idUsuario,
    idEstudio,
    req.usuario.rolActivo
  );
  res.status(200).json(resultado);
});

// HU21: Descargar o previsualizar el informe oficial del estudio en formato PDF
export const descargarInformePdf = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) {
    throw new AppError('No autorizado. Debe iniciar sesión.', 401);
  }
  const idEstudio = parsearId(req.params.idEstudio || req.params.id, 'estudio');
  const bufferPdf = await estudioService.generarInformePdfEstudio(
    req.usuario.idUsuario,
    idEstudio,
    req.usuario.rolActivo
  );

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="informe_estudio_${idEstudio}.pdf"`
  );
  res.status(200).send(bufferPdf);
});

// HU21: Renderizar Visor DICOM PACS Web interactivo integrado (sin depender de Docker local)
export const renderizarVisorDicom = asyncHandler(async (req: Request, res: Response) => {
  const studyInstanceUid =
    (typeof req.query.StudyInstanceUIDs === 'string' && req.query.StudyInstanceUIDs) ||
    (typeof req.query.studyInstanceUid === 'string' && req.query.studyInstanceUid) ||
    (typeof req.query.codigo === 'string' && req.query.codigo) ||
    '';

  const idEstudioRaw =
    typeof req.query.idEstudio === 'string' ? Number.parseInt(req.query.idEstudio, 10) : undefined;
  const idEstudio = idEstudioRaw && !Number.isNaN(idEstudioRaw) ? idEstudioRaw : undefined;

  if (!studyInstanceUid && !idEstudio) {
    res
      .status(403)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .send(
        '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Acceso restringido</title><style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}.card{background:#1e293b;padding:32px;border-radius:12px;max-width:460px;box-shadow:0 10px 25px rgba(0,0,0,.4)}h1{font-size:20px;margin:0 0 12px;color:#38bdf8}p{font-size:14px;line-height:1.5;color:#cbd5e1;margin:0}</style></head><body><div class="card"><h1>Visualizacion individual de estudio</h1><p>Por privacidad medica, el listado general de estudios esta deshabilitado. Seleccione un estudio especifico desde el Sistema Medico para visualizarlo.</p></div></body></html>'
      );
    return;
  }

  const datos = await estudioService.obtenerDatosParaVisorDicom({
    idEstudio,
    studyInstanceUid,
  });

  const html = generarHtmlVisorDicom(datos);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
});
