import multer from 'multer';
import { ApiError } from '../utils/apiError.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Solo se permiten imágenes (JPEG, PNG, WEBP, GIF)'));
  }
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE_BYTES } });
