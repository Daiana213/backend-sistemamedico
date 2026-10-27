import { AppError } from '../utils/AppError';

/**
 * Cliente liviano de Orthanc (PACS) para la HU21.
 *
 * El backend NO almacena imágenes: solo guarda el código / StudyInstanceUID del estudio.
 * Este servicio consulta a Orthanc (server-to-server) para saber si el estudio está
 * disponible en el PACS y devolver metadatos básicos para mostrar en la Historia Clínica.
 *
 * Variables de entorno:
 * - ORTHANC_INTERNAL_URL: URL que usa el backend para hablar con Orthanc (por defecto http://localhost:8042).
 * - ORTHANC_USERNAME / ORTHANC_PASSWORD: por defecto orthanc / orthanc.
 * - PACS_TIMEOUT_MS: timeout de las consultas (por defecto 5000 ms).
 */

const DICOM_UID_REGEX = /^\d+(\.\d+)+$/;

// Tags DICOM (formato DICOM JSON de QIDO-RS)
const TAG = {
  STUDY_DATE: '00080020',
  STUDY_DESCRIPTION: '00081030',
  MODALITIES_IN_STUDY: '00080061',
  NUMBER_OF_STUDY_RELATED_SERIES: '00201206',
  NUMBER_OF_STUDY_RELATED_INSTANCES: '00201208',
  ACCESSION_NUMBER: '00080050',
} as const;

type DicomJson = Record<string, { vr?: string; Value?: unknown[] }>;

function obtenerUrlInterna(): string {
  const url = process.env.ORTHANC_INTERNAL_URL || process.env.ORTHANC_URL || 'http://localhost:8042';
  return url.replace(/\/$/, '');
}

function construirHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/dicom+json, application/json' };
  const usuario = process.env.ORTHANC_USERNAME ?? 'orthanc';
  const password = process.env.ORTHANC_PASSWORD ?? 'orthanc';
  if (usuario && password) {
    headers.Authorization = `Basic ${Buffer.from(`${usuario}:${password}`).toString('base64')}`;
  }
  return headers;
}

async function consultarOrthanc<T>(ruta: string): Promise<T> {
  const baseUrl = obtenerUrlInterna();
  const timeoutMs = Number(process.env.PACS_TIMEOUT_MS) || 5000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const respuesta = await fetch(`${baseUrl}${ruta}`, {
      method: 'GET',
      headers: construirHeaders(),
      signal: controller.signal,
    });

    if (!respuesta.ok) {
      throw new AppError(
        `El PACS respondió con un error (${respuesta.status}).`,
        502
      );
    }

    return (await respuesta.json()) as T;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('No se pudo establecer conexión con el PACS.', 503);
  } finally {
    clearTimeout(timer);
  }
}

function leerValor(dataset: DicomJson, tag: string): unknown {
  return dataset[tag]?.Value?.[0];
}

function formatearFechaDicom(valor: unknown): string | null {
  if (typeof valor !== 'string' || !/^\d{8}$/.test(valor)) return null;
  return `${valor.slice(0, 4)}-${valor.slice(4, 6)}-${valor.slice(6, 8)}`;
}

export function esStudyInstanceUid(codigo: string): boolean {
  return DICOM_UID_REGEX.test(codigo.trim());
}

export function pacsConfigurado(): boolean {
  return Boolean(obtenerUrlInterna());
}

/**
 * Estado de conexión con el PACS (para diagnóstico desde el frontend / soporte).
 */
export async function obtenerEstadoPacs() {
  try {
    const sistema = await consultarOrthanc<{ Name?: string; Version?: string; DicomAet?: string }>(
      '/system'
    );
    return {
      configurado: true,
      disponible: true,
      nombre: sistema.Name ?? 'Orthanc',
      version: sistema.Version ?? 'mainline',
      aeTitle: sistema.DicomAet ?? 'ORTHANC',
      visorConfigurado: Boolean(process.env.OHIF_VIEWER_URL || 'http://localhost:3005'),
    };
  } catch (error) {
    return {
      configurado: true,
      disponible: false,
      mensaje: error instanceof AppError ? error.message : 'No se pudo consultar el PACS.',
    };
  }
}

/**
 * Busca un estudio en Orthanc vía DICOMweb (QIDO-RS) a partir de su StudyInstanceUID.
 */
export async function buscarEstudioEnPacs(codigo: string) {
  const studyInstanceUid = codigo.trim();

  if (!esStudyInstanceUid(studyInstanceUid)) {
    return {
      consultable: false,
      disponibleEnPacs: false,
      mensaje:
        'El código cargado no corresponde a un StudyInstanceUID DICOM, por lo que no puede consultarse en el PACS.',
    };
  }

  let resultados: DicomJson[];
  try {
    resultados = await consultarOrthanc<DicomJson[]>(
      `/dicom-web/studies?StudyInstanceUID=${encodeURIComponent(studyInstanceUid)}`
    );
  } catch {
    return {
      consultable: true,
      disponibleEnPacs: false,
      servidorDesconectado: true,
      mensaje:
        'El servidor PACS local (Orthanc) no se encuentra conectado o no está iniciado en local.',
      ayuda:
        'Podés visualizar el informe médico oficial en PDF o iniciar el contenedor PACS con: docker compose -f docker-compose.pacs.yml up -d',
    };
  }

  if (!Array.isArray(resultados) || resultados.length === 0) {
    return {
      consultable: true,
      disponibleEnPacs: false,
      mensaje: 'El estudio no se encuentra disponible en el PACS.',
    };
  }

  const dataset = resultados[0];
  const modalidades = dataset[TAG.MODALITIES_IN_STUDY]?.Value ?? [];

  return {
    consultable: true,
    disponibleEnPacs: true,
    mensaje: 'Estudio disponible en el PACS.',
    metadatos: {
      studyInstanceUid,
      fechaEstudio: formatearFechaDicom(leerValor(dataset, TAG.STUDY_DATE)),
      descripcion: (leerValor(dataset, TAG.STUDY_DESCRIPTION) as string) ?? null,
      modalidades: modalidades.filter((m): m is string => typeof m === 'string'),
      cantidadSeries: Number(leerValor(dataset, TAG.NUMBER_OF_STUDY_RELATED_SERIES)) || null,
      cantidadImagenes: Number(leerValor(dataset, TAG.NUMBER_OF_STUDY_RELATED_INSTANCES)) || null,
      numeroAcceso: (leerValor(dataset, TAG.ACCESSION_NUMBER) as string) ?? null,
    },
  };
}
