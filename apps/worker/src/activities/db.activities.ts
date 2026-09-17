import client from "../lib/prisma";
import { ProcessingStatus } from "@adaptive-streaming/shared";

export async function updateVideoStatus(videoId:string,status:ProcessingStatus) {
    
    await client.video.update({
        where:{
         videoId
        },
        data:{
            status
        }
    })  
    
}
