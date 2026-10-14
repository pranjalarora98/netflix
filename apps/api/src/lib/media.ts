import path from "path"
import { config } from "../config";

export const uploadsDir = () => {
    
     return path.resolve(config.mediaRoot,'uploads');
    
     
}

export const outputPath = (videoId: string) => {
   
return path.join('output',`/${videoId}`);

}

export const streamPath = (videoId: string) => {
return `/media/output/${videoId}/master.m3u8`;
}