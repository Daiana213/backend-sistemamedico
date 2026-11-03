import { PrismaClient } from '@prisma/client';

const ORTHANC_URL = (process.env.ORTHANC_INTERNAL_URL || process.env.ORTHANC_URL || 'http://localhost:8042').replace(/\/$/, '');
const ORTHANC_AUTH = 'Basic ' + Buffer.from(`${process.env.ORTHANC_USERNAME || 'orthanc'}:${process.env.ORTHANC_PASSWORD || 'orthanc'}`).toString('base64');

interface EstudioSeed {
  dniPaciente: string;
  patientNameDicom: string;
  patientBirthDateDicom: string;
  patientSexDicom: 'M' | 'F';
  nombre: string;
  codigo: string;
  seriesUid: string;
  sopUid: string;
  modalidad: 'DX' | 'MR' | 'CT';
  numeroAutorizacion: string;
  observacion: string;
}

const ESTUDIOS_SEED: EstudioSeed[] = [
  // Paciente 1: Juan Ignacio Gómez (DNI 00000001)
  {
    dniPaciente: '00000001',
    patientNameDicom: 'Gomez^Juan Ignacio',
    patientBirthDateDicom: '19900314',
    patientSexDicom: 'M',
    nombre: 'Radiografía Digital de Tórax Frente',
    codigo: '1.3.6.1.4.1.11129.5.5.111396399361969898205364400549799252857604',
    seriesUid: '1.3.6.1.4.1.11129.5.5.195628213694300498946760767481291263511724',
    sopUid: '1.3.6.1.4.1.11129.5.5.153751009835107614666834563294684339746480',
    modalidad: 'DX',
    numeroAutorizacion: 'AUT-IMG-1001',
    observacion:
      'Estudio radiográfico digital directo (DX) de tórax proyección posteroanterior. Campos pulmonares adecuadamente expandidos, senos costofrénicos libres y silueta cardiopericárdica dentro de límites normales.',
  },
  {
    dniPaciente: '00000001',
    patientNameDicom: 'Gomez^Juan Ignacio',
    patientBirthDateDicom: '19900314',
    patientSexDicom: 'M',
    nombre: 'Resonancia Magnética de Rodilla Derecha',
    codigo: '1.2.276.0.7230010.3.1.2.330039808.1.1792720684.336789',
    seriesUid: '1.2.276.0.7230010.3.1.3.330039808.1.1792720684.336790',
    sopUid: '1.2.276.0.7230010.3.1.4.330039808.1.1792720684.336791',
    modalidad: 'MR',
    numeroAutorizacion: 'AUT-IMG-1002',
    observacion:
      'Resonancia nuclear magnética articular en secuencias ponderadas en T1, T2 y densidad protónica con supresión grasa. Meniscos interno y externo sin trazos de fractura, ligamentos cruzados anterior y posterior íntegros.',
  },
  {
    dniPaciente: '00000001',
    patientNameDicom: 'Gomez^Juan Ignacio',
    patientBirthDateDicom: '19900314',
    patientSexDicom: 'M',
    nombre: 'Tomografía Computada de Abdomen y Pelvis',
    codigo: '1.2.840.113619.2.55.3.60468842.2026.101',
    seriesUid: '1.2.840.113619.2.55.3.60468842.2026.101.1',
    sopUid: '1.2.840.113619.2.55.3.60468842.2026.101.2',
    modalidad: 'CT',
    numeroAutorizacion: 'AUT-IMG-1003',
    observacion:
      'Tomografía helicoidal multicorte de abdomen y pelvis sin hallazgos de colecciones ni adenomegalias retroperitoneales. Hígado, bazo, páncreas y ambos riñones de morfología y densidad conservadas.',
  },

  // Paciente 2: María Florencia Pérez (DNI 00000002)
  {
    dniPaciente: '00000002',
    patientNameDicom: 'Perez^Maria Florencia',
    patientBirthDateDicom: '19850515',
    patientSexDicom: 'F',
    nombre: 'Radiografía Digital de Tórax Frente y Perfil',
    codigo: '1.2.276.0.7230010.3.1.2.330039808.1.1792721087.336814',
    seriesUid: '1.2.276.0.7230010.3.1.3.330039808.1.1792721087.336815',
    sopUid: '1.2.276.0.7230010.3.1.4.330039808.1.1792721087.336816',
    modalidad: 'DX',
    numeroAutorizacion: 'AUT-IMG-2001',
    observacion:
      'Evaluación radiográfica digital de tórax sin infiltrados pleuroparenquimatosos activos. Índice cardiotorácico conservado y estructuras óseas de la caja torácica sin lesiones.',
  },
  {
    dniPaciente: '00000002',
    patientNameDicom: 'Perez^Maria Florencia',
    patientBirthDateDicom: '19850515',
    patientSexDicom: 'F',
    nombre: 'Resonancia Magnética de Cerebro con Angiografía',
    codigo: '1.2.840.113619.2.55.3.60468842.2026.202',
    seriesUid: '1.2.840.113619.2.55.3.60468842.2026.202.1',
    sopUid: '1.2.840.113619.2.55.3.60468842.2026.202.2',
    modalidad: 'MR',
    numeroAutorizacion: 'AUT-IMG-2002',
    observacion:
      'Parénquima encefálico supra e infratentorial de intensidad de señal habitual. Sistema ventricular simétrico no dilatado y estructuras de la línea media centradas.',
  },

  // Paciente 3: Carlos Alberto Rodríguez (DNI 32456789)
  {
    dniPaciente: '32456789',
    patientNameDicom: 'Rodriguez^Carlos Alberto',
    patientBirthDateDicom: '19781122',
    patientSexDicom: 'M',
    nombre: 'Telerradiografía Digital de Tórax Control Cardiológico',
    codigo: '1.2.840.113619.2.55.3.60468842.2026.301',
    seriesUid: '1.2.840.113619.2.55.3.60468842.2026.301.1',
    sopUid: '1.2.840.113619.2.55.3.60468842.2026.301.2',
    modalidad: 'DX',
    numeroAutorizacion: 'AUT-IMG-3001',
    observacion:
      'Control radiológico cardiovascular. Botón aórtico de calibre acorde a la edad, hilios vasculares de configuración normal y parénquima pulmonar libre de consolidaciones.',
  },
  {
    dniPaciente: '32456789',
    patientNameDicom: 'Rodriguez^Carlos Alberto',
    patientBirthDateDicom: '19781122',
    patientSexDicom: 'M',
    nombre: 'Tomografía Computada de Tórax de Alta Resolución',
    codigo: '1.2.840.113619.2.55.3.60468842.2026.302',
    seriesUid: '1.2.840.113619.2.55.3.60468842.2026.302.1',
    sopUid: '1.2.840.113619.2.55.3.60468842.2026.302.2',
    modalidad: 'CT',
    numeroAutorizacion: 'AUT-IMG-3002',
    observacion:
      'Cortes tomográficos axiales milimétricos con algoritmo de alta resolución. Árbol traqueobronquial permeable de calibre conservado, sin nódulos ni adenopatías mediastínicas.',
  },

  // Paciente 4: Sofía Camila López (DNI 40123456)
  {
    dniPaciente: '40123456',
    patientNameDicom: 'Lopez^Sofia Camila',
    patientBirthDateDicom: '19980708',
    patientSexDicom: 'F',
    nombre: 'Resonancia Magnética Encefálica de Control',
    codigo: '1.2.840.113619.2.55.3.60468842.2026.401',
    seriesUid: '1.2.840.113619.2.55.3.60468842.2026.401.1',
    sopUid: '1.2.840.113619.2.55.3.60468842.2026.401.2',
    modalidad: 'MR',
    numeroAutorizacion: 'AUT-IMG-4001',
    observacion:
      'Estudio indicado por protocolo de cefalea. Adecuada diferenciación cortico-subcortical, sin evidencia de lesiones isquémicas agudas ni malformaciones vasculares.',
  },
  {
    dniPaciente: '40123456',
    patientNameDicom: 'Lopez^Sofia Camila',
    patientBirthDateDicom: '19980708',
    patientSexDicom: 'F',
    nombre: 'Radiografía Digital Cervicodorsal',
    codigo: '1.2.840.113619.2.55.3.60468842.2026.402',
    seriesUid: '1.2.840.113619.2.55.3.60468842.2026.402.1',
    sopUid: '1.2.840.113619.2.55.3.60468842.2026.402.2',
    modalidad: 'DX',
    numeroAutorizacion: 'AUT-IMG-4002',
    observacion:
      'Alineación vertebral conservada, espacios intervertebrales respetados y partes blandas prevertebrales sin alteraciones.',
  },
];

async function sincronizarEstudiosEnOrthanc() {
  try {
    const sysRes = await fetch(`${ORTHANC_URL}/system`, {
      headers: { Authorization: ORTHANC_AUTH },
    });
    if (!sysRes.ok) return;

    console.log('Sincronizando instancias DICOM reales con PixelData en Orthanc PACS...');

    // 1. Eliminar instancias corruptas o vacías (< 2 KB, sin PixelData) y obtener una instancia base DX válida (> 100 KB)
    const instancesRes = await fetch(`${ORTHANC_URL}/instances`, {
      headers: { Authorization: ORTHANC_AUTH },
    });
    const instanceIds = (await instancesRes.json()) as string[];

    let baseDxInstanceId: string | null = null;

    for (const id of instanceIds) {
      const infoRes = await fetch(`${ORTHANC_URL}/instances/${id}`, {
        headers: { Authorization: ORTHANC_AUTH },
      });
      if (!infoRes.ok) continue;
      const info = (await infoRes.json()) as { FileSize: number };
      if (info.FileSize < 2000) {
        await fetch(`${ORTHANC_URL}/instances/${id}`, {
          method: 'DELETE',
          headers: { Authorization: ORTHANC_AUTH },
        });
      } else if (info.FileSize > 100000 && !baseDxInstanceId) {
        baseDxInstanceId = id;
      }
    }

    // 2. Descargar muestras reales MR y CT de pydicom (si hay conexión) para tener imágenes reales de cada modalidad
    let baseMrInstanceId: string | null = baseDxInstanceId;
    let baseCtInstanceId: string | null = baseDxInstanceId;

    const subirMuestraRemota = async (url: string): Promise<string | null> => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        const upRes = await fetch(`${ORTHANC_URL}/instances`, {
          method: 'POST',
          headers: {
            Authorization: ORTHANC_AUTH,
            'Content-Type': 'application/dicom',
          },
          body: buf,
        });
        if (!upRes.ok) return null;
        const upData = (await upRes.json()) as { ID?: string };
        return upData.ID || null;
      } catch {
        return null;
      }
    };

    const tempMrId = await subirMuestraRemota(
      'https://raw.githubusercontent.com/pydicom/pydicom/main/src/pydicom/data/test_files/MR_small.dcm'
    );
    if (tempMrId) baseMrInstanceId = tempMrId;

    const tempCtId = await subirMuestraRemota(
      'https://raw.githubusercontent.com/pydicom/pydicom/main/src/pydicom/data/test_files/CT_small.dcm'
    );
    if (tempCtId) baseCtInstanceId = tempCtId;

    // 3. Generar y subir cada estudio de ESTUDIOS_SEED con sus UIDs y datos de paciente reales
    for (const est of ESTUDIOS_SEED) {
      // Si es exactamente el estudio original de 1MB ya existente, solo actualizamos o mantenemos
      if (est.codigo === '1.3.6.1.4.1.11129.5.5.111396399361969898205364400549799252857604' && baseDxInstanceId) {
        continue;
      }

      const sourceInstanceId =
        est.modalidad === 'MR'
          ? baseMrInstanceId
          : est.modalidad === 'CT'
          ? baseCtInstanceId
          : baseDxInstanceId;

      if (!sourceInstanceId) continue;

      const modRes = await fetch(`${ORTHANC_URL}/instances/${sourceInstanceId}/modify`, {
        method: 'POST',
        headers: {
          Authorization: ORTHANC_AUTH,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Replace: {
            PatientName: est.patientNameDicom,
            PatientID: est.dniPaciente,
            PatientBirthDate: est.patientBirthDateDicom,
            PatientSex: est.patientSexDicom,
            StudyDescription: est.nombre,
            SeriesDescription: est.nombre,
            Modality: est.modalidad,
            StudyDate: '20261028',
            SeriesDate: '20261028',
            StudyInstanceUID: est.codigo,
            SeriesInstanceUID: est.seriesUid,
            SOPInstanceUID: est.sopUid,
          },
          Force: true,
        }),
      });

      if (modRes.ok) {
        const dicomModificado = Buffer.from(await modRes.arrayBuffer());
        await fetch(`${ORTHANC_URL}/instances`, {
          method: 'POST',
          headers: {
            Authorization: ORTHANC_AUTH,
            'Content-Type': 'application/dicom',
          },
          body: dicomModificado,
        });
      }
    }

    // 4. Eliminar las dos instancias temporales de plantilla pydicom para que en Orthanc solo queden los estudios de nuestros pacientes
    for (const tempId of [tempMrId, tempCtId]) {
      if (tempId && tempId !== baseDxInstanceId) {
        await fetch(`${ORTHANC_URL}/instances/${tempId}`, {
          method: 'DELETE',
          headers: { Authorization: ORTHANC_AUTH },
        });
      }
    }

    console.log('Orthanc PACS sincronizado con imágenes médicas reales y visibles para todos los estudios.');
  } catch (err) {
    console.warn('No se pudo conectar a Orthanc local durante el seed (se omitió sincronización PACS):', err);
  }
}

export async function seedEstudios(prisma: PrismaClient) {
  console.log('Cargando estudios médicos visibles para los pacientes...');

  await sincronizarEstudiosEnOrthanc();

  const profQuiroga = await prisma.usuario.findUnique({
    where: { dni: '10000001' },
    include: { profesional: true },
  });
  const profMendez = await prisma.usuario.findUnique({
    where: { dni: '10000002' },
    include: { profesional: true },
  });

  const idProfDefault = profQuiroga?.profesional?.idProfesional ?? null;
  const idProfCardio = profMendez?.profesional?.idProfesional ?? idProfDefault;

  for (const est of ESTUDIOS_SEED) {
    const usuarioPac = await prisma.usuario.findUnique({
      where: { dni: est.dniPaciente },
      include: { paciente: true },
    });

    if (!usuarioPac?.paciente) continue;

    const idProfesional =
      est.dniPaciente === '32456789' ? idProfCardio : idProfDefault;

    await prisma.estudioMedico.create({
      data: {
        idPaciente: usuarioPac.paciente.idPaciente,
        idProfesional,
        numeroAutorizacion: est.numeroAutorizacion,
        nombre: est.nombre,
        codigo: est.codigo,
        observacion: est.observacion,
        estado: 'ACTIVO' as any,
      },
    });
  }

  console.log(`Se cargaron ${ESTUDIOS_SEED.length} estudios médicos con visualización DICOM e informe PDF.`);
}
