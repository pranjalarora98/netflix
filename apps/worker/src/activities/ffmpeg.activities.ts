import path from "path";
import fs from 'fs/promises';
import ffmpeg from "fluent-ffmpeg";
import { config } from "../config";
import { Resolution } from "@adaptive-streaming/shared";
import prisma from '../lib/prisma';

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

export async function transcodeResolution(inputRel:string, outputRel:string, resolution:Resolution,videoId: string){

    const {width,height,label} = resolution;

    const inputPath = resolveMediaPath(inputRel);
    const outputPath = resolveMediaPath(outputRel);
    const variantOutput = path.join(outputPath,resolution.label);
    const variantPlaylist = path.join(variantOutput,'playlist.m3u8');
    
    await fs.mkdir(variantOutput,{recursive:true});
    
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          `-vf scale=${resolution.width}:${resolution.height}`,
          `-b:v ${resolution.bitRate}k`,
          "-codec:v libx264",
          "-codec:a aac",
          "-hls_time 10",
          "-hls_playlist_type vod",
          `-hls_segment_filename ${path.join(
            variantOutput,
            "segment-%05d.ts",
          )}`,
        ])
        .output(variantPlaylist)
        .on("end", async () => {
         await prisma.videoVariant.upsert({
            where:{
               videoId_label:{
               videoId,
              label:resolution.label,
               }
            },
            update:{
               status: "completed",
            },
            create:{
               videoId,
               label:resolution.label,
               status:'completed',
               resolution:`${resolution.width}X${resolution.height}`,
            }
          });
          resolve(true);
        })
        .on("error", async (err: Error) => {
         await prisma.videoVariant.upsert({
            where:{
            videoId_label:{
               videoId,
              label:resolution.label,
               }
            },
            update:{
               status: "failed",
            },
            create:{
               videoId,
               label:resolution.label,
               status:'failed',
               resolution:`${resolution.width}X${resolution.height}`,
            }
          });
                   reject(err);
      }
      )
        .run();
    });

    return `#EXT-X-STREAM-INF:BANDWIDTH=${resolution.bitRate * 1000},RESOLUTION=${width}x${height}\n${label}/playlist.m3u8`;
}

 export async function writeMasterPlaylist(outputRelativePath: string,resolutionEntries: string[]) {
     const targetPath = resolveMediaPath(outputRelativePath);
     const masterPath = path.join(targetPath,'master.m3u8');

     const body = `#EXTM3U\n${resolutionEntries.join('\n')}\n`;
     await fs.writeFile(masterPath,body);
    return `${outputRelativePath}/master.m3u8`;
 }
