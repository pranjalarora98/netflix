import { outputPath } from "../lib/media";
import { execute } from "../lib/temporal";
import { createVideo } from "../repository/video.repository";


export async function createVideoService(file: {
    filename:string,
}) {
 
    const videoId = String(Date.now());
     await createVideo({videoId,name:file.originalname});
    const workflowId = await execute({videoId,inputRelativePath:'uploads/'+file.filename, outputRelativePath:outputPath(videoId) })
    return {videoId,status:'pending',workflowId}
}