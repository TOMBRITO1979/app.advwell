import multer from 'multer';

// Configurar multer para armazenar arquivo em memória
const storage = multer.memoryStorage();

// Magic bytes (file signatures) para validação de conteúdo real
const MAGIC_BYTES: Record<string, number[][]> = {
  // PDF: %PDF
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  // JPEG: FFD8FF
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/jpg': [[0xFF, 0xD8, 0xFF]],
  // PNG: 89504E47
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  // GIF: GIF87a or GIF89a
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  // WebP: RIFF....WEBP
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  // ZIP: PK
  'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06], [0x50, 0x4B, 0x07, 0x08]],
  // RAR: Rar!
  'application/x-rar-compressed': [[0x52, 0x61, 0x72, 0x21]],
  // 7z: 7z¼¯'
  'application/x-7z-compressed': [[0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C]],
  // GZIP: 1F8B
  'application/gzip': [[0x1F, 0x8B]],
  // TAR: ustar (at offset 257)
  'application/x-tar': [], // TAR needs special handling, skip magic byte check
  // DOC (old): D0CF11E0
  'application/msword': [[0xD0, 0xCF, 0x11, 0xE0]],
  // DOCX/XLSX/PPTX: PK (ZIP-based)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4B, 0x03, 0x04]],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [[0x50, 0x4B, 0x03, 0x04]],
  // XLS (old): D0CF11E0
  'application/vnd.ms-excel': [[0xD0, 0xCF, 0x11, 0xE0]],
  // PPT (old): D0CF11E0
  'application/vnd.ms-powerpoint': [[0xD0, 0xCF, 0x11, 0xE0]],
};

// Tipos que não precisam de validação de magic bytes (texto simples)
const TEXT_TYPES = ['text/plain', 'text/csv'];

// Lista de tipos MIME permitidos (SVG REMOVIDO - vetor de XSS)
const allowedMimes = [
  // Documentos
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Imagens (SVG REMOVIDO por segurança)
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  // 'image/svg+xml', // REMOVED: SVG can contain XSS
  // Arquivos compactados
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
];

// Filtro de tipos de arquivo
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
  }
};

/**
 * Validates file content by checking magic bytes
 * Returns true if the file content matches its declared MIME type
 */
export const validateFileContent = (buffer: Buffer, declaredMimeType: string): boolean => {
  // Skip validation for text files (no magic bytes)
  if (TEXT_TYPES.includes(declaredMimeType)) {
    return true;
  }

  // Skip validation for types without magic bytes defined
  const signatures = MAGIC_BYTES[declaredMimeType];
  if (!signatures || signatures.length === 0) {
    return true;
  }

  // Check if buffer starts with any of the valid signatures
  for (const signature of signatures) {
    if (buffer.length >= signature.length) {
      let matches = true;
      for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Middleware to validate file content after multer processes it
 * Use this AFTER multer upload middleware
 */
export const validateUploadContent = (req: any, res: any, next: any) => {
  if (!req.file) {
    return next();
  }

  const { buffer, mimetype } = req.file;

  if (!validateFileContent(buffer, mimetype)) {
    return res.status(400).json({
      error: 'Conteúdo do arquivo não corresponde ao tipo declarado',
      message: 'O arquivo parece estar corrompido ou ter o tipo incorreto',
    });
  }

  next();
};

// Configuração do multer (limite reduzido para 25MB)
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB máximo (reduzido de 50MB)
  },
});

// Upload para fotos de perfil (limite menor)
export const profilePhotoUpload = multer({
  storage,
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (imageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas para foto de perfil'));
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB para fotos de perfil
  },
});
