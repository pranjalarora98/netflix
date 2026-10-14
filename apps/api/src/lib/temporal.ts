import { Client, Connection } from "@temporalio/client"
import { config } from "../config";
import { PROCESS_VIDEO_WORKFLOW, ProcessVideoInput } from "@adaptive-streaming/shared";

let clientPromise:Promise<Client>;


export function getTemporalClient(): Promise<Client> {
    if(!clientPromise) {
    clientPromise = Connection.connect({address:config.temporalAddress}).then((connection)=>{
        return new Client({connection});
    })
    } 
    return clientPromise;
}



export async function execute(input:ProcessVideoInput) {
     
   const client =  await getTemporalClient();

   return await client.workflow.start(PROCESS_VIDEO_WORKFLOW,
    {
        taskQueue:config.temporalTaskQueue,
        workflowId:`process-video-${input.videoId}`,
        args:[input]
   })

}