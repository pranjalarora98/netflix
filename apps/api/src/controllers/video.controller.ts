import { Request, Response } from 'express';
import { createVideoService } from '../services/video.service';
import { findAllVideos, findVideoByVideoId } from '../repository/video.repository';
import { streamPath } from '../lib/media';

/**
 * The database calls them `status` and `name`. The React app expects
 * `processingStatus` and `originalFileName` — see apps/web/src/api/client.ts.
 * Return a raw row and HomePage runs undefined.toLowerCase() and blanks out.
 */
function toSummary(video: {
  videoId: string;
  status: string;
  name: string;
  createdAt: Date;
}) {
  return {
    videoId: video.videoId,
    originalFileName: video.name,
    processingStatus: video.status,
    // a PATH, not a URL — the frontend prefixes it with API_URL itself.
    // null until the master playlist actually exists.
    streamUrl: video.status === 'completed' ? streamPath(video.videoId) : null,
    createdAt: video.createdAt.toISOString(),
  };
}

export async function upload(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    // multer found no part named "video" — usually a mismatch with
    // formData.append('video', file) on the client
    res.status(400).json({ success: false, message: 'No file uploaded. Expected a field named "video".' });
    return;
  }

  try {
    const result = await createVideoService(req.file);
    res.status(201).json({
      success: true,
      message: 'Upload accepted. Transcoding has been queued.',
      data: result,
    });
  } catch (err) {
    // the row may exist while the workflow never started — see the service
    console.error('[upload] failed:', err);
    res.status(500).json({ success: false, message: 'Could not queue the video for processing.' });
  }
}

export async function list(_req: Request, res: Response): Promise<void> {
  const videos = await findAllVideos();
  res.json({ data: videos.map(toSummary) });
}

// typing the params tells TypeScript videoId is a single string, not string[]
export async function getOne(req: Request<{ videoId: string }>, res: Response): Promise<void> {
  const video = await findVideoByVideoId(req.params.videoId);

  if (!video) {
    // the repository returns null rather than throwing, so 404 is ours to send
    res.status(404).json({ message: 'Video not found' });
    return;
  }

  res.json({ data: toSummary(video) });
}
