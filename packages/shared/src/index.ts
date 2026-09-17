export const TASK_QUEUE = 'video-processing'

export const PROCESS_VIDEO_WORKFLOW = 'processVideoWorkflow'

export interface Resolution {
    width: number;
    height: number;
    bitRate: number;
    label: string;
}

export const RESOLUTIONS: Resolution[] = [
  {
    width: 1920,
    height: 1080,
    bitRate: 2000,
    label: "1080",
  },
  {
    width: 1280,
    height: 720,
    bitRate: 1000,
    label: "720",
  },
  {
    width: 960,
    height: 540,
    bitRate: 500,
    label: "540",
  },
  {
    width: 640,
    height: 360,
    bitRate: 400,
    label: "360",
  },
];

export interface ProcessVideoInput {
    videoId: string;
    inputRelativePath: string;
    outputRelativePath: string;
}

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'
