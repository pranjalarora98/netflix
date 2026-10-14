import fs from 'fs';
import multer from 'multer';
import { uploadsDir } from '../lib/media';

// multer will not create its destination — it throws ENOENT on the first upload.
// Doing it once here, at module load, rather than on every request.
fs.mkdirSync(uploadsDir(), { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir());
  },
  filename: (_req, file, cb) => {
    // two people uploading holiday.mp4 in the same second must not collide
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2 GB — long.mp4 alone is 77 MB
  },
});
