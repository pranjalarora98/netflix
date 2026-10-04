import path from "path";
import fs from 'fs/promises';
import ffmpeg from "fluent-ffmpeg";
import { config } from "../config";
import { Resolution } from "@adaptive-streaming/shared";

ffmpeg.setFfmpegPath(config.ffmpegPath);
ffmpeg.setFfprobePath(config.ffprobePath);

export function resolveMediaPath(relativePath: string) {
   const trimmedPath = relativePath.replace(/^\/+/, '');
   const resolvedPath = path.resolve(config.mediaRoot,trimmedPath);
   return resolvedPath; 
}
