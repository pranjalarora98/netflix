import { Router } from 'express';
import { upload } from '../middlewares/upload.middleware';
import * as videoController from '../controllers/video.controller';

const videoRouter = Router();

// 'video' must match formData.append('video', file) in apps/web/src/api/client.ts.
// A different string and multer finds nothing, leaving req.file undefined.
videoRouter.post('/upload', upload.single('video'), videoController.upload);

videoRouter.get('/', videoController.list);

// keep this last — '/:videoId' would otherwise swallow '/upload'
videoRouter.get('/:videoId', videoController.getOne);

export default videoRouter;
