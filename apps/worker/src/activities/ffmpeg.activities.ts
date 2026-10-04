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

export async function ensureOutputDirectory(outputRelativePath:string) {
   const resolvedPath = resolveMediaPath(outputRelativePath);
   await fs.mkdir(resolvedPath,{recursive:true});
}

export async function deleteSourceFile(inputRelativePath:string) {
    const inputPath = resolveMediaPath(inputRelativePath);
 const exists = await fs.access(inputPath).then(()=>true).catch(()=>false);
  
 if(exists) {
    await fs.unlink(inputPath);
 }

}
