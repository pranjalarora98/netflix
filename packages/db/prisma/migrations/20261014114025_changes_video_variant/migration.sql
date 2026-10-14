-- CreateTable
CREATE TABLE "VideoVariant" (
    "id" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "videoId" TEXT NOT NULL,

    CONSTRAINT "VideoVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoVariant_videoId_status_idx" ON "VideoVariant"("videoId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VideoVariant_videoId_label_key" ON "VideoVariant"("videoId", "label");

-- AddForeignKey
ALTER TABLE "VideoVariant" ADD CONSTRAINT "VideoVariant_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
