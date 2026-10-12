import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as authService from '../services/authService';
import { prisma } from '../config/prisma';
import { sendValidationCode } from '../services/whatsapp.service';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const resultado = await authService.login(req.body);
  res.status(200).json(resultado);
});

export const seleccionarRol = asyncHandler(async (req: Request, res: Response) => {
  const resultado = await authService.seleccionarRol(req.body);
  res.status(200).json(resultado);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const resultado = await authService.refresh(req.body.refreshToken);
  res.status(200).json(resultado);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.body.refreshToken);
  res.status(200).json({ mensaje: 'Sesión cerrada correctamente' });
});

export const solicitarRecuperacionPassword = asyncHandler(async (req: Request, res: Response) => {
  const resultado = await authService.solicitarRecuperacionPassword(req.body);
  res.status(200).json(resultado);
});

export const restablecerPassword = asyncHandler(async (req: Request, res: Response) => {
  const resultado = await authService.restablecerPassword(req.body);
  res.status(200).json(resultado);
});

export const cambiarPassword = asyncHandler(async (req: Request, res: Response) => {
  const idUsuario = req.usuario!.idUsuario;
  const resultado = await authService.cambiarPassword(idUsuario, req.body);
  res.status(200).json(resultado);
});

const CODIGO_TWILIO_SANDBOX = process.env.TWILIO_PRESET_CODE || '482913';

export const requestPhoneCode = asyncHandler(async (req: Request, res: Response) => {
  const { telefono } = req.body;
  if (!telefono) {
    res.status(400).json({ message: 'El teléfono es requerido' });
    return;
  }
  
  const cleanTelefono = String(telefono).trim();
  // En cuenta de prueba / prototipo Twilio Sandbox, se utiliza el código preestablecido que Twilio envía
  const codigo = CODIGO_TWILIO_SANDBOX;
  console.log('===== VERIFICACIÓN WHATSAPP (PROTOTIPO) =====');
  console.log(`Teléfono: ${cleanTelefono}`);
  console.log(`Código Twilio preestablecido guardado en DB: ${codigo}`);
  console.log('============================================');
  
  const fechaExpiracion = new Date();
  fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 10);

  await prisma.codigoVerificacion.create({
    data: {
      telefono: cleanTelefono,
      codigo,
      fechaExpiracion,
    },
  });

  await sendValidationCode(cleanTelefono, codigo);

  res.status(200).json({ message: 'Código enviado exitosamente' });
});

export const verifyPhoneCode = asyncHandler(async (req: Request, res: Response) => {
  const { telefono, codigo } = req.body;
  
  if (!telefono || !codigo) {
    res.status(400).json({ message: 'Teléfono y código son requeridos' });
    return;
  }

  const cleanTelefono = String(telefono).trim();
  const codigoIngresado = String(codigo).trim();

  // Permitir match tanto con o sin el prefijo '+'
  const posiblesTelefonos = [
    cleanTelefono,
    cleanTelefono.startsWith('+') ? cleanTelefono.slice(1) : `+${cleanTelefono}`,
  ];

  const registro = await prisma.codigoVerificacion.findFirst({
    where: {
      telefono: { in: posiblesTelefonos },
      utilizado: false,
    },
    orderBy: {
      idCodigo: 'desc',
    },
  });

  if (!registro) {
    res.status(400).json({ message: 'Código no encontrado o ya utilizado' });
    return;
  }

  if (registro.codigo !== codigoIngresado) {
    res.status(400).json({ message: 'Código inválido' });
    return;
  }

  if (new Date() > registro.fechaExpiracion) {
    res.status(400).json({ message: 'Código expirado' });
    return;
  }

  await prisma.codigoVerificacion.update({
    where: { idCodigo: registro.idCodigo },
    data: { utilizado: true },
  });

  res.status(200).json({ message: 'Teléfono verificado exitosamente' });
});
