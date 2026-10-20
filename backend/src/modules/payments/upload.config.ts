import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';

/** Répertoire de stockage des fichiers uploadés (monté sur un volume en prod). */
export const UPLOAD_DIR = join(process.cwd(), 'uploads');

/** Préfixe public de service des fichiers (routé vers le backend par Caddy). */
export const UPLOAD_URL_PREFIX = '/api/v1/uploads/files';

export function ensureUploadDir(): void {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/** Options multer : images (+ PDF), 5 Mo max, nom de fichier aléatoire. */
export const paymentProofMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      ensureUploadDir();
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file: { originalname: string }, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file: { mimetype: string }, cb: (e: Error | null, ok: boolean) => void) => {
    if (!ALLOWED.includes(file.mimetype)) {
      cb(new BadRequestException('Format non autorisé (JPG, PNG, WEBP ou PDF).'), false);
      return;
    }
    cb(null, true);
  },
};
