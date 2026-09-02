import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import path from 'path';
import { Request } from 'express';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const extensionesPermitidas = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

    if (!extensionesPermitidas.includes(extension)) {
      throw new Error('Tipo de archivo no permitido');
    }

    const esPdf = extension === '.pdf';

    return {
      folder: 'documentos-responsables',
      resource_type: 'auto',
      format: esPdf ? 'pdf' : extension.replace('.', ''),
      public_id: `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      allowed_formats: esPdf ? ['pdf'] : ['jpg', 'jpeg', 'png', 'webp'],
      use_filename: false,
      unique_filename: true,
    };
  },
});

const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF, JPG, PNG o WEBP'));
  }
}

export const uploadDocumentoResponsable = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});