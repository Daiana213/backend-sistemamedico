import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const CARPETA_DESTINO = path.join(process.cwd(), 'uploads', 'documentos-responsables');

if (!fs.existsSync(CARPETA_DESTINO)) {
  fs.mkdirSync(CARPETA_DESTINO, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CARPETA_DESTINO),
  filename: (_req, file, cb) => {
    const sufijo = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${sufijo}${path.extname(file.originalname)}`);
  },
});

const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'];

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF, JPG o PNG'));
  }
}

export const uploadDocumentoResponsable = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});