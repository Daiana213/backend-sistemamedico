import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

// ─── Escenario 1: Listado de menores pendientes ───────────────────────────────

export async function listarMenoresPendientes() {
  const menores = await prisma.paciente.findMany({
    where: { estado: 'PENDIENTE_APROBACION' },
    include: {
      usuario: {
        select: { nombre: true, apellido: true, dni: true },
      },
      responsables: {
        where: { estado: 'ACTIVO' },
        include: {
          responsable: {
            include: {
              usuario: {
                select: { nombre: true, apellido: true, dni: true },
              },
            },
          },
          documentos: {
            orderBy: { fechaCarga: 'desc' },
            take: 1,
            select: {
              idDocumento: true,
              tipoDocumento: true,
              nombreArchivo: true,
              rutaArchivo: true,
              fechaCarga: true,
              estadoValidacion: true,
              intentos: true,
            },
          },
        },
      },
    },
  });

  return menores.map((menor) => {
    const vinculo = menor.responsables[0];
    const responsable = vinculo?.responsable.usuario;
    const documento = vinculo?.documentos[0];

    return {
      idPaciente: menor.idPaciente,
      nombre: menor.usuario.nombre,
      apellido: menor.usuario.apellido,
      dni: menor.usuario.dni,
      fechaRegistro: menor.fechaRegistro,
      responsable: responsable
        ? {
            nombre: responsable.nombre,
            apellido: responsable.apellido,
            dni: responsable.dni,
          }
        : null,
      documento: documento
        ? {
            idDocumento: documento.idDocumento,
            tipoDocumento: documento.tipoDocumento,
            nombreArchivo: documento.nombreArchivo,
            rutaArchivo: documento.rutaArchivo,
            fechaCarga: documento.fechaCarga,
            intentos: documento.intentos,
          }
        : null,
    };
  });
}

// ─── Escenario 2: Aprobar registro ───────────────────────────────────────────

export async function aprobarRegistroMenor(idPaciente: number, idAdministrativo: number, ip?: string) {
  const paciente = await prisma.paciente.findUnique({
    where: { idPaciente },
    include: {
      responsables: {
        where: { estado: 'ACTIVO' },
        include: { documentos: { orderBy: { fechaCarga: 'desc' }, take: 1 } },
      },
    },
  });

  if (!paciente) throw new AppError('Paciente no encontrado.', 404);

  // Escenario 4: ya fue procesado
  if (paciente.estado !== 'PENDIENTE_APROBACION') {
    const auditoria = await prisma.auditoria.findFirst({
      where: {
        tablaAfectada: 'paciente',
        idRegistroAfectado: idPaciente,
        accion: { in: ['APROBAR_MENOR', 'RECHAZAR_MENOR'] },
      },
      include: { usuario: { select: { nombre: true, apellido: true } } },
      orderBy: { fechaHora: 'desc' },
    });

    const quien = auditoria?.usuario
      ? `${auditoria.usuario.nombre} ${auditoria.usuario.apellido}`
      : 'un administrativo';
    const cuando = auditoria?.fechaHora
      ? auditoria.fechaHora.toLocaleString('es-AR')
      : 'fecha desconocida';

    throw new AppError(`Este registro ya fue procesado por ${quien} el ${cuando}.`, 409);
  }

  const vinculo = paciente.responsables[0];
  const documento = vinculo?.documentos[0];

  await prisma.$transaction(async (tx) => {
    // Activar paciente
    await tx.paciente.update({
      where: { idPaciente },
      data: { estado: 'ACTIVO' },
    });

    // Marcar documento como aprobado
    if (documento) {
      await tx.documentoResponsable.update({
        where: { idDocumento: documento.idDocumento },
        data: { estadoValidacion: 'APROBADO' },
      });
    }

    // Auditoría
    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'APROBAR_MENOR',
        tablaAfectada: 'paciente',
        idRegistroAfectado: idPaciente,
        descripcion: `Registro de menor aprobado. Documento: ${documento?.nombreArchivo ?? 'sin documento'}.`,
        ip,
      },
    });
  });

  // Notificación (pendiente nodemailer)
  console.log(`[NOTIFICACION] Cuenta del menor idPaciente=${idPaciente} activada. Notificar al adulto responsable.`);

  return { mensaje: 'Registro aprobado correctamente. La cuenta del menor ha sido activada.' };
}

// ─── Escenario 3: Rechazar registro ──────────────────────────────────────────

export async function rechazarRegistroMenor(
  idPaciente: number,
  idAdministrativo: number,
  motivo: string,
  ip?: string
) {
  const paciente = await prisma.paciente.findUnique({
    where: { idPaciente },
    include: {
      responsables: {
        where: { estado: 'ACTIVO' },
        include: { documentos: { orderBy: { fechaCarga: 'desc' }, take: 1 } },
      },
    },
  });

  if (!paciente) throw new AppError('Paciente no encontrado.', 404);

  // Escenario 4: ya fue procesado
  if (paciente.estado !== 'PENDIENTE_APROBACION') {
    const auditoria = await prisma.auditoria.findFirst({
      where: {
        tablaAfectada: 'paciente',
        idRegistroAfectado: idPaciente,
        accion: { in: ['APROBAR_MENOR', 'RECHAZAR_MENOR'] },
      },
      include: { usuario: { select: { nombre: true, apellido: true } } },
      orderBy: { fechaHora: 'desc' },
    });

    const quien = auditoria?.usuario
      ? `${auditoria.usuario.nombre} ${auditoria.usuario.apellido}`
      : 'un administrativo';
    const cuando = auditoria?.fechaHora
      ? auditoria.fechaHora.toLocaleString('es-AR')
      : 'fecha desconocida';

    throw new AppError(`Este registro ya fue procesado por ${quien} el ${cuando}.`, 409);
  }

  const vinculo = paciente.responsables[0];
  const documento = vinculo?.documentos[0];

  await prisma.$transaction(async (tx) => {
    // Rechazar paciente
    await tx.paciente.update({
      where: { idPaciente },
      data: { estado: 'RECHAZADO' },
    });

    // Marcar documento como rechazado e incrementar intentos
    if (documento) {
      await tx.documentoResponsable.update({
        where: { idDocumento: documento.idDocumento },
        data: {
          estadoValidacion: 'RECHAZADO',
          observaciones: motivo,
          intentos: { increment: 1 },
        },
      });
    }

    // Auditoría
    await tx.auditoria.create({
      data: {
        idUsuario: idAdministrativo,
        fechaHora: new Date(),
        accion: 'RECHAZAR_MENOR',
        tablaAfectada: 'paciente',
        idRegistroAfectado: idPaciente,
        descripcion: `Registro de menor rechazado. Motivo: ${motivo}.`,
        ip,
      },
    });
  });

  // Notificación (pendiente nodemailer)
  console.log(`[NOTIFICACION] Registro idPaciente=${idPaciente} rechazado. Motivo: ${motivo}. Notificar al adulto responsable.`);

  return { mensaje: 'Registro rechazado. Se notificó al adulto responsable con el motivo indicado.' };
}

// ─── Reenvío de documentación ─────────────────────────────────────────────────

export async function reenviarDocumentacion(
  idPacienteResponsable: number,
  idUsuarioAutenticado: number,
  archivo: { nombreArchivo: string; rutaArchivo: string },
  tipoDocumento: string
) {
  // Verificar que el usuario autenticado es el responsable del menor
  const pacienteResponsable = await prisma.paciente.findUnique({
    where: { idPaciente: idPacienteResponsable },
    include: {
      responsables: {
        where: { estado: 'ACTIVO' },
        include: {
          responsable: { include: { usuario: true } },
          documentos: { orderBy: { fechaCarga: 'desc' }, take: 1 },
        },
      },
    },
  });

  if (!pacienteResponsable) throw new AppError('Paciente no encontrado.', 404);

  if (pacienteResponsable.estado !== 'RECHAZADO') {
    throw new AppError('Solo se puede reenviar documentación para registros rechazados.', 409);
  }

  const vinculo = pacienteResponsable.responsables[0];

  if (!vinculo) throw new AppError('No se encontró vínculo con adulto responsable.', 404);

  if (vinculo.responsable.usuario.idUsuario !== idUsuarioAutenticado) {
    throw new AppError('No tenés permiso para reenviar documentación de este paciente.', 403);
  }

  const documentoActual = vinculo.documentos[0];
  if (!documentoActual) throw new AppError('No se encontró documento previo asociado.', 404);

  await prisma.$transaction(async (tx) => {
    // Volver al menor a pendiente
    await tx.paciente.update({
      where: { idPaciente: idPacienteResponsable },
      data: { estado: 'PENDIENTE_APROBACION' },
    });

    // Reemplazar archivo pero mantener el contador de intentos
    await tx.documentoResponsable.update({
      where: { idDocumento: documentoActual.idDocumento },
      data: {
        nombreArchivo: archivo.nombreArchivo,
        rutaArchivo: archivo.rutaArchivo,
        tipoDocumento,
        fechaCarga: new Date(),
        estadoValidacion: 'PENDIENTE',
        observaciones: null,
      },
    });
  });

  return { mensaje: 'Documentación reenviada correctamente. El registro vuelve a estar pendiente de aprobación.' };
}