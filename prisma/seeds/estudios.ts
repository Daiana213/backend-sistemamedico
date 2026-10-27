import { PrismaClient } from '@prisma/client';

export async function seedEstudios(prisma: PrismaClient) {
  console.log('Creando y actualizando estudios médicos con UIDs reales de Orthanc PACS...');

  const paciente1 = await prisma.usuario.findUnique({
    where: { dni: '00000001' },
    include: { paciente: true },
  });

  const paciente2 = await prisma.usuario.findUnique({
    where: { dni: '00000002' },
    include: { paciente: true },
  });

  if (paciente1?.paciente) {
    const idPaciente = paciente1.paciente.idPaciente;

    // Actualizar posibles códigos viejos si ya existían
    await prisma.estudioMedico.updateMany({
      where: {
        idPaciente,
        codigo: '1.2.840.113619.2.55.3.60468842',
      },
      data: {
        codigo: '1.2.276.0.7230010.3.1.2.330039808.1.1792720684.336789',
        nombre: 'Resonancia Magnética de Rodilla',
      },
    });

    await prisma.estudioMedico.updateMany({
      where: {
        idPaciente,
        codigo: '2.16.840.1.113669.632.20.1211.10000223',
      },
      data: {
        codigo: '1.3.6.1.4.1.11129.5.5.111396399361969898205364400549799252857604',
        nombre: 'Radiografía Digital de Tórax Frente',
      },
    });

    const estudiosPaciente1 = [
      {
        nombre: 'Resonancia Magnética de Rodilla',
        codigo: '1.2.276.0.7230010.3.1.2.330039808.1.1792720684.336789',
        observacion:
          'Protocolo de rodilla secuencias T1, T2 y DP fat-sat. Meniscos y ligamentos cruzados íntegros. Estudio DICOM en Orthanc PACS.',
      },
      {
        nombre: 'Radiografía Digital de Tórax Frente',
        codigo: '1.3.6.1.4.1.11129.5.5.111396399361969898205364400549799252857604',
        observacion:
          'Estudio digital directo (DX). Campos pulmonares libres, senos costofrénicos nítidos, silueta cardiovascular conservada.',
      },
      {
        nombre: 'Laboratorio de Análisis Clínico Completo',
        codigo: 'LAB-2026-88491',
        observacion:
          'Hemograma completo, glucemia en ayunas, perfil lipídico, función renal y hepatograma dentro de parámetros normales.',
      },
      {
        nombre: 'Electrocardiograma de Reposo',
        codigo: 'ECG-55102',
        observacion:
          'Ritmo sinusal regular, frecuencia cardíaca 72 lpm, trazado dentro de límites normales.',
      },
    ];

    for (const est of estudiosPaciente1) {
      const existente = await prisma.estudioMedico.findFirst({
        where: {
          idPaciente,
          codigo: est.codigo,
        },
      });

      if (!existente) {
        await prisma.estudioMedico.create({
          data: {
            idPaciente,
            nombre: est.nombre,
            codigo: est.codigo,
            observacion: est.observacion,
            estado: 'ACTIVO',
          },
        });
      } else {
        await prisma.estudioMedico.update({
          where: { idEstudio: existente.idEstudio },
          data: {
            nombre: est.nombre,
            observacion: est.observacion,
            estado: 'ACTIVO',
          },
        });
      }
    }
    console.log('Estudios médicos verificados y sincronizados para Paciente Uno.');
  }

  if (paciente2?.paciente) {
    const idPaciente = paciente2.paciente.idPaciente;

    // Actualizar posibles códigos viejos
    await prisma.estudioMedico.updateMany({
      where: {
        idPaciente,
        codigo: '1.2.392.200036.9125.0.199511221151',
      },
      data: {
        codigo: '1.2.276.0.7230010.3.1.2.330039808.1.1792721087.336814',
        nombre: 'Radiografía Computarizada (CR)',
      },
    });

    const estudiosPaciente2 = [
      {
        nombre: 'Radiografía Computarizada (CR)',
        codigo: '1.2.276.0.7230010.3.1.2.330039808.1.1792721087.336814',
        observacion:
          'Evaluación radiográfica digital computarizada (CR) sin particularidades patológicas agudas detectables. Estudio DICOM en Orthanc PACS.',
      },
      {
        nombre: 'Ecografía Abdominal Completa',
        codigo: 'ECO-994821',
        observacion:
          'Hígado, vesícula biliar, páncreas, bazo y riñones de características ecográficas conservadas.',
      },
    ];

    for (const est of estudiosPaciente2) {
      const existente = await prisma.estudioMedico.findFirst({
        where: {
          idPaciente,
          codigo: est.codigo,
        },
      });

      if (!existente) {
        await prisma.estudioMedico.create({
          data: {
            idPaciente,
            nombre: est.nombre,
            codigo: est.codigo,
            observacion: est.observacion,
            estado: 'ACTIVO',
          },
        });
      } else {
        await prisma.estudioMedico.update({
          where: { idEstudio: existente.idEstudio },
          data: {
            nombre: est.nombre,
            observacion: est.observacion,
            estado: 'ACTIVO',
          },
        });
      }
    }
    console.log('Estudios médicos verificados y sincronizados para Paciente Dos.');
  }
}
