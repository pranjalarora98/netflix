import { Router } from 'express';
import videoRouter from './video.route';

const routes = Router();

// mounted at /api/v1 in src/index.ts, so this yields /api/v1/videos/...
routes.use('/videos', videoRouter);

export { routes };
