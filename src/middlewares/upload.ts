import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import path from 'path';
import { Request } from 'express';

// 1. Configuración de credenciales de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Configuración del Storage con lógica condicional para PDFs
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const extensionesPermitidas = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

    // Validación inicial por extensión
    if (!extensionesPermitidas.includes(extension)) {
      throw new Error('Tipo de archivo no permitido');
    }

    const isPdf = extension === '.pdf';

    return {
      folder: 'documentos-responsables',
      // Los PDFs van como documento binario (raw), las imágenes se procesan automáticamente
      resource_type: isPdf ? 'raw' : 'auto',
      public_id: `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      // Excluimos la propiedad 'format' si es un PDF (raw) para evitar el error interno de Cloudinary
      ...(isPdf ? {} : { format: extension.replace('.', '') }),
    };
  },
});

// 3. Filtro de seguridad adicional por MimeType
const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF, JPG, PNG o WEBP'));
  }
}

// 4. Exportación del middleware para usar en las rutas
export const uploadDocumentoResponsable = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite estricto de 5MB
});