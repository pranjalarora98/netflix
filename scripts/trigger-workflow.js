/**
 * Throwaway harness — starts ONE processVideoWorkflow by hand.
 *
 * This is what the API will eventually do in apps/api/src/lib/temporal.ts.
 * Doing it here first means that if something breaks, it is the worker —
 * there is no Express, no multer, no routing to hide behind.
 *
 * Run with:   npx dotenv -e .env -- node scripts/trigger-workflow.js
 */

const { Connection, Client } = require('@temporalio/client');
const { prisma } = require('../packages/db/dist');

async function main() {
  // the API will use String(Date.now()) too
  const videoId = String(Date.now());
  const inputRelativePath = process.argv[2] || 'uploads/demo.mp4';
  const outputRelativePath = `output/${videoId}`;

  // 1. the row MUST exist first — updateVideoStatus does prisma.video.update,
  //    which throws P2025 if no row matches videoId
  await prisma.video.create({
    data: { videoId, name: 'demo.mp4', status: 'pending' },
  });
  console.log('✓ row created   videoId =', videoId);

  // 2. hand the job to Temporal
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  });
  const client = new Client({ connection });

  const handle = await client.workflow.start('processVideoWorkflow', {
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'video-processing',
    workflowId: `process-video-${videoId}`,
    args: [{ videoId, inputRelativePath, outputRelativePath }],
  });

  console.log('✓ workflow queued', handle.workflowId);
  console.log('  watch it:      http://localhost:8088');
  console.log('  output lands:  MEDIA_ROOT/' + outputRelativePath);

  await connection.close();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('✗', err.message);
  process.exit(1);
});
