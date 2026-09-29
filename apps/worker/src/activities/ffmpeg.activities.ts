/**
 * ═════════════════════════════════════════════════════════════════════════════
 * FILE 4 of 6  ·  THE FFMPEG ACTIVITIES
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * This is the file everything else exists to support. Roughly 90 lines, five
 * functions, and it is where a .mp4 becomes four folders of .ts chunks.
 *
 * Reminder of what you are producing, for ONE upload:
 *
 *     MEDIA_ROOT/output/<videoId>/
 *       master.m3u8            ← written by writeMasterPlaylist (task 6)
 *       1080p/
 *         playlist.m3u8        ← written by ffmpeg itself
 *         segment-00000.ts     ← 10 seconds of video
 *         segment-00001.ts
 *       720p/  480p/  360p/    ← same shape
 *
 * FIVE FUNCTIONS, in the order you will write them:
 *
 *   resolveMediaPath        (helper, NOT exported)  — path safety
 *   ensureOutputDirectory   (exported)              — mkdir
 *   deleteSourceFile        (exported)              — cleanup
 *   transcodeResolution     (exported)              — THE BIG ONE
 *   writeMasterPlaylist     (exported)              — the quality index
 *
 * Everything except the helper is an ACTIVITY: it touches disk, it can fail,
 * Temporal retries it. That is why none of them have try/catch — see File 3.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE IDEA BEFORE YOU START: fluent-ffmpeg IS NOT A VIDEO LIBRARY.
 *
 * It decodes nothing. It builds a command line and runs the `ffmpeg` binary
 * as a child process. Everything you write here could equally be a bash
 * script. For the 720p rung, the literal command you are constructing is:
 *
 *     ffmpeg -i /media/uploads/a1b2c3.mp4 \
 *       -vf scale=1280:720 \
 *       -b:v 1000k \
 *       -codec:v libx264 \
 *       -codec:a aac \
 *       -hls_time 10 \
 *       -hls_playlist_type vod \
 *       -hls_segment_filename …/720p/segment-%05d.ts \
 *       …/720p/playlist.m3u8
 *
 * If you get lost, run that by hand in a terminal on any .mp4 and look at
 * what lands on disk. The code is just assembling that string.
 * ═════════════════════════════════════════════════════════════════════════════
 */

/* ═══════════════════════════════════════════════════════════════════════════
 * TASK 1 — imports and one-time setup
 *
 * You need:
 *
 *   path                 from 'path'            (node builtin)
 *   fs                   from 'fs/promises'     (note: the PROMISES version,
 *                                                so you can await it)
 *   ffmpeg               from 'fluent-ffmpeg'   (default import, no braces)
 *   { config }           from '../config'
 *   { Resolution }       from '@adaptive-streaming/shared'
 *
 * Then, at module level (not inside any function), tell fluent-ffmpeg where
 * the binaries live:
 *
 *     ffmpeg.setFfmpegPath(config.ffmpegPath);
 *     ffmpeg.setFfprobePath(config.ffprobePath);
 *
 * WHY CONFIGURABLE? On your Mac ffmpeg is at /opt/homebrew/bin/ffmpeg. In the
 * Docker image it is /usr/bin/ffmpeg. Your .env sets FFMPEG_PATH=ffmpeg, which
 * means "find it on PATH" — fine in both places, but the hook is there for
 * when it is not.
 * ═══════════════════════════════════════════════════════════════════════════ */

// write the imports and the two setPath calls here

import path from "path";
import fs from 'fs/promises';
import {Ffmpeg} from "fluent-ffmpeg";
import { config } from "../config";
import { Resolution } from "@adaptive-streaming/shared";

Ffmpeg.setFfmpegPath(config.ffmpegPath);
Ffmpeg.setFfprobePath(config.ffprobePath);

/* ═══════════════════════════════════════════════════════════════════════════
 * TASK 2 — resolveMediaPath(relativePath) → absolute path
 *
 * This is SECURITY CODE. Read the whole block before writing it.
 *
 * Every path in this file arrives as a string that started life in an HTTP
 * request. Downstream, deleteSourceFile calls fs.unlink on it. So if someone
 * can smuggle in '../../../../etc/passwd', they can delete files anywhere
 * your process can reach.
 *
 * This one function is the wall. Everything else calls it first.
 *
 * WRITE A PLAIN (not exported, not async) FUNCTION THAT:
 *
 *   1. strips any leading slashes from the input
 *          relativePath.replace(/^\/+/, '')
 *
 *      WHY: path.resolve('/media/root', '/etc/passwd') returns '/etc/passwd'.
 *      It THROWS AWAY everything to the left when it meets an absolute
 *      segment. So a leading slash defeats the whole function. Strip it.
 *
 *   2. resolves it against the media root
 *          path.resolve(config.mediaRoot, stripped)
 *
 *      WHY RESOLVE BEFORE CHECKING: path.resolve collapses '..' for you. So
 *      'output/../../../etc/shadow' BECOMES '/etc/shadow', and then your
 *      check below catches it. Scanning the raw string for '..' first is the
 *      amateur version — it loses to encodings and to '....//'.
 *
 *   3. also computes the resolved root
 *          path.resolve(config.mediaRoot)
 *
 *   4. THROWS if the result escaped, i.e. if either:
 *        - it equals the root exactly
 *              WHY: an empty relative path resolves to MEDIA_ROOT itself, and
 *              deleteSourceFile('') would try to unlink your whole media dir.
 *        - it does not start with `${root}${path.sep}`
 *              WHY THE SEPARATOR: without it, '/media/root-backup' passes a
 *              naive startsWith('/media/root'). The trailing slash forces a
 *              real "is inside this directory" test.
 *
 *   5. otherwise returns the absolute path
 *
 * SYNTAX — throwing with a useful message:
 *
 *     throw new Error(`Invalid media path: ${relativePath}`);
 *
 * Include the offending value. A bare 'Invalid path' tells you nothing at
 * 2am.
 * ═══════════════════════════════════════════════════════════════════════════ */

// write resolveMediaPath here

export function resolveMediaPath(relativePath: string) {
   const trimmedPath = relativePath.replace(/^\/+/, '');
   const resolvedPath = path.resolve(config.mediaRoot,trimmedPath);
   return resolvedPath; 
}

/* ═══════════════════════════════════════════════════════════════════════════
 * TASK 3 — ensureOutputDirectory(outputRelativePath)   [warm-up]
 *
 * An exported async activity. Resolve the path, then create the directory.
 *
 * SYNTAX — create a directory, parents included, no error if it exists:
 *
 *     await fs.mkdir(somePath, { recursive: true });
 *
 *   recursive: true does two useful things at once — makes intermediate
 *   folders, and stays silent if the target already exists. Without it, a
 *   retry of this activity would crash on the second attempt.
 *
 * That last point matters: Temporal retries activities. An activity that
 * breaks when run twice is a broken activity. The word for one that does not
 * is IDEMPOTENT, and it is the single most useful property an activity can
 * have.
 * ═══════════════════════════════════════════════════════════════════════════ */

// write ensureOutputDirectory here

async function ensureOutputDirectory(outputRelativePath:string) {
   const resolvedPath = resolveMediaPath(outputRelativePath);
   await fs.mkdir(resolvedPath,{recursive:true});
}

/* ═══════════════════════════════════════════════════════════════════════════
 * TASK 4 — deleteSourceFile(inputRelativePath)
 *
 * Once the four rungs exist, the original upload is dead weight — often a
 * multi-GB file. Delete it.
 *
 * But: check it exists first, because this activity may be retried after
 * succeeding, and fs.unlink on a missing file throws.
 *
 * SYNTAX — "does this exist?" as a boolean:
 *
 *     const exists = await fs.access(p).then(() => true).catch(() => false);
 *     if (exists) {
 *       await fs.unlink(p);
 *     }
 *
 *   fs.access RESOLVES if reachable, REJECTS if not. The .then/.catch pair
 *   converts that into true/false instead of letting it throw.
 *
 * Idempotent again: run it ten times, the file is gone once, no crash.
 * ═══════════════════════════════════════════════════════════════════════════ */

// write deleteSourceFile here

async function deleteSourceFile(inputRelativePath:string) {
    const inputPath = resolveMediaPath(inputRelativePath);
 const exists = await fs.access(inputPath).then(()=>true).catch(()=>false);
  
 if(exists) {
    await fs.unlink(inputPath);
 }

}

/* ═══════════════════════════════════════════════════════════════════════════
 * TASK 5 — transcodeResolution(inputRel, outputRel, resolution)
 * ───────────────────────────────────────────────────────────── THE BIG ONE ──
 *
 * Takes one rung of the ladder, produces one folder of chunks, and RETURNS
 * TWO LINES OF PLAYLIST TEXT (see the end of this block — that return value
 * is the clever bit).
 *
 * STEP A — work out three paths:
 *     inputPath        resolveMediaPath(inputRel)
 *     outputPath       resolveMediaPath(outputRel)
 *     variantOutput    outputPath + separator + resolution.label
 *                      e.g.  …/output/1755678901234/720p
 *     variantPlaylist  variantOutput + separator + 'playlist.m3u8'
 *
 *   Use path.join(a, b) rather than gluing strings with '/' — it handles
 *   separators correctly and is what you will see in real code.
 *
 * STEP B — mkdir the variant folder, recursive, as in task 3.
 *   Each rung writes to its own folder, which is exactly why four of these
 *   can run at the same time without colliding.
 *
 * STEP C — run ffmpeg, wrapped in a Promise.
 *
 *   WHY A PROMISE WRAPPER? fluent-ffmpeg is event-based — it shouts 'end' or
 *   'error' when it finishes. `await` only understands promises. So you build
 *   a promise whose resolve/reject you wire to those two events:
 *
 *     await new Promise((resolve, reject) => {
 *       ffmpeg(inputPath)
 *         .outputOptions([ ...flags... ])
 *         .output(variantPlaylist)
 *         .on('end',   () => resolve(true))
 *         .on('error', (err) => reject(err))
 *         .run();
 *     });
 *
 *   Read it as: "make a promise. It settles when ffmpeg tells us it is done."
 *   Nothing starts until .run(). Everything before that is string-building.
 *
 *   .output() ending in .m3u8 is what selects the HLS muxer — the part that
 *   writes the .ts chunks AND generates playlist.m3u8 for you. Name it .mp4
 *   instead and every -hls_ flag becomes an unknown-option error.
 *
 *   THE FLAGS, as an array of strings:
 *
 *     `-vf scale=${resolution.width}:${resolution.height}`
 *     `-b:v ${resolution.bitRate}k`
 *     '-codec:v libx264'
 *     '-codec:a aac'
 *     '-hls_time 10'
 *     '-hls_playlist_type vod'
 *     `-hls_segment_filename ${path.join(variantOutput, 'segment-%05d.ts')}`
 *
 *   (What each one does: see the artifact, section 04. %05d is printf-style
 *    zero padding — segment-00000.ts — which keeps them sorting correctly.)
 *
 * STEP D — RETURN TWO LINES OF TEXT:
 *
 *     `#EXT-X-STREAM-INF:BANDWIDTH=${resolution.bitRate * 1000},RESOLUTION=${w}x${h}\n${label}/playlist.m3u8`
 *
 *   * bitRate * 1000 because your config is in kbps and HLS wants bits/sec
 *   * \n is a real newline inside the string — two lines, one return value
 *   * the path is RELATIVE ('720p/playlist.m3u8'), which is what lets you
 *     move this whole folder to S3 later without rewriting anything
 *
 *   WHY RETURN TEXT INSTEAD OF WRITING THE FILE HERE? Because the workflow
 *   runs four of these with Promise.all, and Promise.all hands results back
 *   IN INPUT ORDER, not completion order. 360p finishes first but still lands
 *   last. So the master playlist comes out deterministic, with four parallel
 *   processes and zero coordination between them. Have them all append to one
 *   file instead and you would need locking, and the order would be random.
 * ═══════════════════════════════════════════════════════════════════════════ */

// write transcodeResolution here

async function transcodeResolution(inputRel:string, outputRel:string, resolution:Resolution){
    const inputPath = resolveMediaPath(inputRel);
    const outputPath = resolveMediaPath(outputRel);
    const variantOutput = path.join(outputPath,resolution.label);
    const variantPlaylist = path.join(variantOutput,'playlist.m3u8');
    await fs.mkdir(variantPlaylist,{recursive:true})
}

/* ═══════════════════════════════════════════════════════════════════════════
 * TASK 6 — writeMasterPlaylist(outputRelativePath, resolutionEntries)
 *
 * Takes the four strings from task 5 and writes the index of qualities.
 *
 *   resolutionEntries is a string[] — four items, each two lines.
 *
 * The file must be exactly:
 *
 *     #EXTM3U
 *     <entry 1>
 *     <entry 2>
 *     <entry 3>
 *     <entry 4>
 *
 * SYNTAX — join an array into one string, and write it:
 *
 *     const body = `#HEADER\n${items.join('\n')}\n`;
 *     await fs.writeFile(targetPath, body);
 *
 * Also mkdir the output directory first (recursive) — cheap insurance if this
 * activity is retried on a fresh machine.
 *
 * Return the relative path to master.m3u8. Mind the template literal: it
 * needs a $ before the brace. Missing that is a real bug in the reference
 * implementation, and the compiler will not catch it because
 * "{outputRelativePath}/master.m3u8" is a perfectly valid string.
 * ═══════════════════════════════════════════════════════════════════════════ */

// write writeMasterPlaylist here

/* ═══════════════════════════════════════════════════════════════════════════
 * WHEN YOU ARE DONE
 *
 *   1. add './ffmpeg.activities' to apps/worker/src/activities/index.ts
 *   2. npx tsc --noEmit -p apps/worker/tsconfig.json
 *   3. tell me — we will run a REAL transcode against a real video file
 *      before writing the workflow, so you can see the chunks appear on disk.
 *
 * Compare: git diff main -- apps/worker/src/activities/ffmpeg.activities.ts
 * ═══════════════════════════════════════════════════════════════════════════ */
