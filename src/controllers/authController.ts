import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as authService from '../services/authService';

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

export const requestPhoneCode = asyncHandler(async (req: Request, res: Response) => {
  const { telefono } = req.body;
  if (!telefono) {
    res.status(400).json({ message: 'El teléfono es requerido' });
    return;
  }
  
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('===== ATENCIÓN =====');
  console.log(`Código generado y guardado en DB: ${codigo}`);
  console.log('====================');
  
  const fechaExpiracion = new Date();
  fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 5);

  const { prisma } = require('../config/prisma');

  await prisma.codigoVerificacion.create({
    data: {
      telefono,
      codigo,
      fechaExpiracion
    }
  });

  const { sendValidationCode } = require('../services/whatsapp.service');
  await sendValidationCode(telefono, codigo);

  res.status(200).json({ message: 'Código enviado exitosamente' });
});

export const verifyPhoneCode = asyncHandler(async (req: Request, res: Response) => {
  const { telefono } = req.body;
  const codigo = String(req.body.codigo); // Aseguramos que sea un string por si desde Postman lo mandan como número
  
  if (!telefono || !req.body.codigo) {
    res.status(400).json({ message: 'Teléfono y código son requeridos' });
    return;
  }

  const { prisma } = require('../config/prisma');

  const registro = await prisma.codigoVerificacion.findFirst({
    where: {
      telefono,
      utilizado: false
    },
    orderBy: {
      idCodigo: 'desc' // Mejor ordenar por ID autoincremental para asegurar que siempre sea el último exacto
    }
  });

  if (!registro) {
    res.status(400).json({ message: 'Código no encontrado o ya utilizado' });
    return;
  }

  if (registro.codigo !== codigo) {
    res.status(400).json({ message: 'Código inválido' });
    return;
  }

  if (new Date() > registro.fechaExpiracion) {
    res.status(400).json({ message: 'Código expirado' });
    return;
  }

  await prisma.codigoVerificacion.update({
    where: { idCodigo: registro.idCodigo },
    data: { utilizado: true }
  });

  res.status(200).json({ message: 'Teléfono verificado exitosamente' });
});