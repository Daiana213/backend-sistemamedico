import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as authService from '../services/authService';
import { prisma } from '../config/prisma';
import { sendValidationCode } from '../services/whatsapp.service';
import { enviarCodigoVerificacionEmail } from '../services/email.service';
import { hashToken } from '../utils/crypto';
import { verifyAccessToken } from '../utils/jwt';

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
const NUMERO_TWILIO_TEST = process.env.TWILIO_TEST_NUMBER || '+5493562440089';

const esNumeroTwilioSandbox = (telefono: string): boolean => {
  const digits = telefono.replace(/\D/g, '');
  const testDigits = NUMERO_TWILIO_TEST.replace(/\D/g, '');
  return digits === testDigits || digits.endsWith('3562440089');
};

export const requestPhoneCode = asyncHandler(async (req: Request, res: Response) => {
  const { telefono } = req.body;
  if (!telefono) {
    res.status(400).json({ message: 'El teléfono es requerido' });
    return;
  }
  
  const cleanTelefono = String(telefono).trim();
  // En cuenta de prueba / prototipo Twilio Sandbox, se utiliza el código preestablecido que Twilio envía
  const codigo = CODIGO_TWILIO_SANDBOX;

  const fechaExpiracion = new Date();
  fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 10);

  await prisma.codigoVerificacion.create({
    data: {
      telefono: cleanTelefono,
      codigo,
      fechaExpiracion,
    },
  });

  // En prototipo, el mensaje de WhatsApp solo se envía cuando coincide con el número habilitado en Twilio Sandbox (+5493562440089)
  if (esNumeroTwilioSandbox(cleanTelefono)) {
    const telefonoDestino = cleanTelefono.startsWith('+') ? cleanTelefono : NUMERO_TWILIO_TEST;
    await sendValidationCode(telefonoDestino, codigo);
  }

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

// Genera una clave determinística de <= 30 caracteres para almacenar el OTP de email en CodigoVerificacion
function obtenerClaveVerificacionEmail(email: string): string {
  return `em_${hashToken(email.toLowerCase()).slice(0, 26)}`;
}

export const requestEmailCode = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ message: 'El correo electrónico es requerido.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    res.status(400).json({ message: 'El formato del correo electrónico no es válido.' });
    return;
  }

  let idUsuarioActual: number | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = verifyAccessToken(authHeader.slice(7));
      idUsuarioActual = payload.idUsuario;
    } catch {
      // Token opcional
    }
  }

  const usuarioConEmail = await prisma.usuario.findFirst({
    where: {
      email: { equals: cleanEmail, mode: 'insensitive' },
      ...(idUsuarioActual ? { idUsuario: { not: idUsuarioActual } } : {}),
    },
  });

  if (usuarioConEmail) {
    res.status(409).json({
      message: 'El correo electrónico ingresado ya se encuentra registrado por otro usuario.',
      error: 'El correo electrónico ingresado ya se encuentra registrado por otro usuario.',
    });
    return;
  }

  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  const fechaExpiracion = new Date(Date.now() + 10 * 60 * 1000);
  const claveEmail = obtenerClaveVerificacionEmail(cleanEmail);

  await prisma.codigoVerificacion.create({
    data: {
      telefono: claveEmail,
      codigo,
      fechaExpiracion,
    },
  });

  await enviarCodigoVerificacionEmail(cleanEmail, codigo);

  res.status(200).json({ message: 'Código de verificación enviado a tu correo electrónico.' });
});

export const verifyEmailCode = asyncHandler(async (req: Request, res: Response) => {
  const { email, codigo } = req.body;

  if (!email || !codigo) {
    res.status(400).json({ message: 'El correo electrónico y el código son requeridos.' });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const codigoIngresado = String(codigo).trim();
  const claveEmail = obtenerClaveVerificacionEmail(cleanEmail);

  const registro = await prisma.codigoVerificacion.findFirst({
    where: {
      telefono: claveEmail,
      utilizado: false,
    },
    orderBy: {
      idCodigo: 'desc',
    },
  });

  if (!registro) {
    res.status(400).json({ message: 'Código no encontrado o ya utilizado.' });
    return;
  }

  if (registro.codigo !== codigoIngresado) {
    res.status(400).json({ message: 'El código ingresado es incorrecto.' });
    return;
  }

  if (new Date() > registro.fechaExpiracion) {
    res.status(400).json({ message: 'El código ha expirado. Solicitá uno nuevo.' });
    return;
  }

  await prisma.codigoVerificacion.update({
    where: { idCodigo: registro.idCodigo },
    data: { utilizado: true },
  });

  res.status(200).json({ message: 'Correo electrónico verificado exitosamente.' });
});

