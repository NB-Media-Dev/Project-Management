import multer from 'multer';
import fs from 'node:fs';

export const MAX_CONTENT_LENGTH = Number.parseInt(process.env.MAX_CONTENT_LENGTH_BYTES || process.env.MAX_CONTENT_LENGTH, 10) || (55 * 1024 * 1024);
export const MAX_FILE_SIZE = Number.parseInt(process.env.MAX_FILE_SIZE_BYTES || process.env.MAX_FILE_SIZE, 10) || (10 * 1024 * 1024);
export const MAX_FILES_COUNT = Number.parseInt(process.env.MAX_FILES_COUNT || process.env.MAX_FILES, 10) || 5;

export const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, uploadDir); },
  filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    fieldSize: 1 * 1024 * 1024,
    files: MAX_FILES_COUNT,
    fields: 10,
    headerPairs: 100,
  },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
});
