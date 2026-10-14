import { proxyActivities } from "@temporalio/workflow";
import type * as activities from '../activities';
import { ProcessVideoInput,RESOLUTIONS } from "@adaptive-streaming/shared";

// import { updateVideoStatus } from "../activities";
// import { ensureOutputDirectory,transcodeResolution,writeMasterPlaylist,deleteSourceFile } from "../activities/ffmpeg.activities";

const {updateVideoStatus,ensureOutputDirectory,transcodeResolution,writeMasterPlaylist,deleteSourceFile} = proxyActivities<typeof activities>({
    startToCloseTimeout: '1 hour',
    retry: {maximumAttempts: 3},
});

export async function processVideoWorkflow(input: ProcessVideoInput) {
   
    const {videoId,inputRelativePath,outputRelativePath} = input;

    try {
        await updateVideoStatus(videoId,'processing');
  
        const resolutionEntries = await Promise.allSettled(
            RESOLUTIONS.map((resolution)=>{
            return transcodeResolution(inputRelativePath,outputRelativePath,resolution,videoId);
        }))

        const allSettleResolutions = resolutionEntries.filter((item)=>item.status === 'fulfilled').map((item)=>item.value);

        if(!allSettleResolutions.length) {
            throw new Error('No resolution succeeded');
        }
         
        await writeMasterPlaylist(outputRelativePath,allSettleResolutions);

        await updateVideoStatus(videoId,'completed');

    }
    catch(err) {
       
   await  updateVideoStatus(videoId,'failed');
    throw err;
    }
    
      
}
