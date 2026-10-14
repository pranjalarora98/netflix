import prisma from '../lib/prisma';

const createVideo = async (item:{
    videoId: string,
    name: string
}) => {
     
   const r = await prisma.video.create({
        data:{
      ...item
        }
    })

    return r;

}

const findAllVideos = async () => {
    return await prisma.video.findMany({
        orderBy:{
           createdAt:'desc'
        }
    })
}

const findVideoByVideoId = async (id: string) => {
return await prisma.video.findUnique({
    where:{
      videoId:id
    }
})
}

export {createVideo,findAllVideos,findVideoByVideoId};