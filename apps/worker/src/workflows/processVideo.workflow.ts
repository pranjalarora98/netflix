/**
 * ═════════════════════════════════════════════════════════════════════════════
 * FILE 5 of 6  ·  THE WORKFLOW — the recipe card
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Everything you have written so far DOES things. This file does nothing at
 * all — it only decides what happens, and in what order.
 *
 * That is not a limitation, it is the point. Remember the rule:
 *
 *   ACTIVITY  touches the real world. Can fail. Retried automatically.
 *   WORKFLOW  touches nothing. Replayed from the top after a crash,
 *             skipping steps already recorded as done.
 *
 * For the replay to work, this file must produce THE SAME STEPS IN THE SAME
 * ORDER every time it runs. So inside this file you may NOT:
 *
 *     read a file · call the database · make a network request
 *     use Math.random() · use Date.now() or new Date()
 *
 * If you need any of those, it belongs in an activity.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RECIPE YOU ARE WRITING
 *
 *     1. mark the video "processing"
 *     2. make the output folder
 *     3. transcode all four rungs — IN PARALLEL
 *     4. write master.m3u8 from the four strings they returned
 *     5. delete the original upload
 *     6. mark the video "completed"
 *        …and if anything threw, mark it "failed" instead
 * ═════════════════════════════════════════════════════════════════════════════
 */

/* ═══════════════════════════════════════════════════════════════════════════
 * TASK 1 — the imports
 *
 *     import { proxyActivities } from '@temporalio/workflow';
 *     import type * as activities from '../activities';
 *     import { ProcessVideoInput, RESOLUTIONS } from '@adaptive-streaming/shared';
 *
 * NOTE THE WORD `type` ON THE SECOND LINE. That is not decoration.
 *
 * `import type` imports ONLY the type information, and vanishes completely
 * when TypeScript compiles. Without it, this file would really import your
 * activities — dragging fs, Prisma and fluent-ffmpeg into the deterministic
 * sandbox, which forbids all of them. The bundle would fail to build.
 *
 * You want the SHAPE of your activities (so TypeScript can check your calls),
 * never the activities themselves.
 * ═══════════════════════════════════════════════════════════════════════════ */

// write the imports here

import { proxyActivities } from "@temporalio/workflow";
import type * as activities from '../activities';
import { ProcessVideoInput,RESOLUTIONS } from "@adaptive-streaming/shared";

/* ═══════════════════════════════════════════════════════════════════════════
 * TASK 2 — the activity stubs
 *
 * SYNTAX:
 *
 *     const { doThing, doOtherThing } = proxyActivities<typeof activities>({
 *       startToCloseTimeout: '1 hour',
 *       retry: { maximumAttempts: 3 },
 *     });
 *
 * WHAT THIS ACTUALLY GIVES YOU: not your functions. STUBS with the same names
 * and the same signatures. Calling one does not run your code — it puts a
 * ticket on the task queue and waits for some worker (maybe a different
 * machine) to run the real thing and report back.
 *
 * That indirection is the whole trick. It is why a crashed worker loses
 * nothing, and why you get retries without writing any.
 *
 *   startToCloseTimeout   how long ONE attempt may take before it is killed.
 *                         Four parallel 1080p transcodes are slow — an hour
 *                         is a sane ceiling for this project.
 *   retry.maximumAttempts how many times to try before giving up and
 *                         failing the workflow.
 *
 * YOUR TURN: destructure all five activities you exported:
 *            updateVideoStatus, ensureOutputDirectory, transcodeResolution,
 *            writeMasterPlaylist, deleteSourceFile
 *
 * (If TypeScript cannot find one, you forgot to export it — or forgot the
 *  ffmpeg line in activities/index.ts.)
 * ═══════════════════════════════════════════════════════════════════════════ */

// write the proxyActivities call here

import { updateVideoStatus } from "../activities";
import { ensureOutputDirectory,transcodeResolution,writeMasterPlaylist,deleteSourceFile } from "../activities/ffmpeg.activities";

/* ═══════════════════════════════════════════════════════════════════════════
 * TASK 3 — the workflow function
 *
 * SYNTAX — a workflow is just an exported async function:
 *
 *     export async function sendWelcomeEmail(input: WelcomeInput) {
 *       await markPending(input.userId);
 *       const rendered = await renderTemplate(input.userId);
 *       await deliver(input.userId, rendered);
 *       return { userId: input.userId };
 *     }
 *
 * ITS NAME MATTERS. The API starts the workflow by the string
 * PROCESS_VIDEO_WORKFLOW, which is 'processVideoWorkflow'. Your exported
 * function must be spelled exactly that, or Temporal cannot find it — and it
 * will not tell you at compile time.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * YOUR TURN: export an async function `processVideoWorkflow` taking one
 *            parameter of type ProcessVideoInput.
 *
 * Pull the three fields out of it first:
 *
 *     const { videoId, inputRelativePath, outputRelativePath } = input;
 *
 * Then, inside a try block, the six steps.
 *
 * STEP 3 IS THE ONLY INTERESTING ONE — four transcodes at once:
 *
 *     const resolutionEntries = await Promise.all(
 *       RESOLUTIONS.map((resolution) => transcodeResolution(
 *         inputRelativePath, outputRelativePath, resolution
 *       ))
 *     );
 *
 *   RESOLUTIONS.map(...)  turns your 4 objects into 4 calls
 *   Promise.all(...)      fires all 4, waits for all 4
 *   resolutionEntries     string[4] — and IN INPUT ORDER, not finish order,
 *                         which is exactly why the master playlist comes out
 *                         deterministic with zero coordination
 *
 * Then hand those four strings to writeMasterPlaylist.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * THE CATCH BLOCK
 *
 *     } catch (error) {
 *       await updateVideoStatus(videoId, 'failed');
 *       throw error;                 // ← re-throw. do not swallow it.
 *     }
 *
 * WHY RE-THROW? Because the row saying "failed" is for the user, and the
 * thrown error is for Temporal. Swallow it and Temporal records the workflow
 * as a success — it disappears from the UI's failure list and you lose the
 * stack trace.
 *
 * WHEN DOES THIS EVEN RUN? Only after an activity has exhausted all 3
 * attempts. Transient failures never reach here.
 *
 * RETURN, on success: { videoId, masterPlaylistRelativePath }
 * (Nothing reads it today — the API never looks at the workflow result. It is
 *  there for the Temporal UI, where you can see what a run produced.)
 * ═══════════════════════════════════════════════════════════════════════════ */

// write processVideoWorkflow here

/* ═══════════════════════════════════════════════════════════════════════════
 * WHEN DONE — two steps, and the second one is the trap
 *
 *   1. re-export it from apps/worker/src/workflows/index.ts  (that file is
 *      currently 0 bytes). Forget this and bundleWorkflowCode cheerfully
 *      builds a bundle containing NO workflows. Nothing fails at compile
 *      time; Temporal just rejects the workflow type at runtime.
 *
 *   2. npm run build -w @adaptive-streaming/worker
 *      then: grep -c processVideoWorkflow apps/worker/dist/workflow-bundle.js
 *      A zero there means step 1 did not happen.
 *
 * REMEMBER FOR THE REST OF THIS PROJECT: editing a workflow file does nothing
 * until you rebuild the bundle. The worker runs dist/workflow-bundle.js, not
 * your source.
 *
 * Compare: git diff main -- apps/worker/src/workflows/processVideo.workflow.ts
 * ═══════════════════════════════════════════════════════════════════════════ */
