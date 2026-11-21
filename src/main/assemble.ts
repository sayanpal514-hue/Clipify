import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { getJob, getClips, getClip, getWords, updateClipStatus } from './db'
import { getBinPath } from './bin'
import { getSettings } from './settings'
import { detectFace, computeCropX } from './face'
import type { Clip, Word } from '../../shared/types'

const execFileAsync = promisify(execFile)

export async function assemble(
  jobId: string,
  onProgress: (percent: number, msg: string) => void
): Promise<void> {
  const job = getJob(jobId)
  if (!job) throw new Error(`Job ${jobId} not found`)

  const metadata = job.metadata as any
  const videoPath: string = metadata?.actual_path ?? job.source_path
  const clips = getClips(jobId)
  const words = getWords(jobId)
  const settings = getSettings()

  fs.mkdirSync(settings.outputFolder, { recursive: true })

  const total = clips.length || 1
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    onProgress(Math.floor((i / total) * 95), `Assembling clip ${i + 1} / ${clips.length}…`)
    try {
      await processClip(clip, words, videoPath, settings.outputFolder, metadata)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Assemble] Clip ${clip.id} failed:`, msg)
      updateClipStatus(clip.id, 'error')
    }
  }
  onProgress(100, 'All clips assembled')
}

async function processClip(
  clip: Clip,
  words: Word[],
  videoPath: string,
  outputFolder: string,
  metadata: any
): Promise<void> {
  const tmpDir = path.join(app.getPath('temp'), 'clipify', clip.id)
  fs.mkdirSync(tmpDir, { recursive: true })

  const ffmpeg = getBinPath('ffmpeg')
  const startSec = Math.max(0, clip.start_time - 0.5)
  const duration = clip.end_time - clip.start_time + 1

  // ── Step 1: Cut raw clip ─────────────────────────────────────────────────
  const rawPath = path.join(tmpDir, 'raw.mp4')
  await runFfmpeg(ffmpeg, [
    '-y', '-ss', String(startSec),
    '-i', videoPath,
    '-t', String(duration),
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
    '-c:a', 'aac', '-b:a', '192k',
    rawPath,
  ])

  // ── Step 2: Extract middle frame for face detection ──────────────────────
  const framePath = path.join(tmpDir, 'frame.jpg')
  await runFfmpeg(ffmpeg, [
    '-y', '-ss', String(duration / 2),
    '-i', rawPath,
    '-vframes', '1', '-q:v', '2',
    framePath,
  ]).catch(() => { /* non-fatal */ })

  const frameWidth: number = metadata?.width ?? 1920
  const frameHeight: number = metadata?.height ?? 1080
  const faceBbox = await detectFace(framePath)
  const cropX = computeCropX(faceBbox, frameWidth, frameHeight)
  const cropWidth = Math.floor((frameHeight * 9) / 16)

  // ── Step 3: Reframe to 9:16, scale to 1080×1920 ─────────────────────────
  const reframedPath = path.join(tmpDir, 'reframed.mp4')
  await runFfmpeg(ffmpeg, [
    '-y', '-i', rawPath,
    '-vf', `crop=${cropWidth}:${frameHeight}:${cropX}:0,scale=1080:1920`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
    '-c:a', 'aac', '-b:a', '192k',
    reframedPath,
  ])

  // ── Step 4: Burn .ass subtitles ──────────────────────────────────────────
  const clipWords = words.filter(
    (w) => w.idx >= clip.start_word_idx && w.idx <= clip.end_word_idx
  )
  const assPath = path.join(tmpDir, 'subtitles.ass')
  generateAssSubtitles(assPath, clipWords, clip.start_time)

  const subtitledPath = path.join(tmpDir, 'subtitled.mp4')
  await runFfmpeg(ffmpeg, [
    '-y', '-i', reframedPath,
    '-vf', `ass=${assPath.replace(/\\/g, '/')}`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
    '-c:a', 'copy',
    subtitledPath,
  ])

  // ── Step 5: Loudness normalization ───────────────────────────────────────
  const outputPath = path.join(outputFolder, `clip_${clip.id.slice(0, 8)}.mp4`)
  await runFfmpeg(ffmpeg, [
    '-y', '-i', subtitledPath,
    '-af', 'loudnorm=I=-14:TP=-1:LRA=11',
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k',
    outputPath,
  ])

  updateClipStatus(clip.id, 'exported', outputPath)

  // Cleanup temp files
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
}

async function runFfmpeg(ffmpegBin: string, args: string[]): Promise<void> {
  try {
    await execFileAsync(ffmpegBin, args)
  } catch (err: any) {
    const lines: string[] = (err.stderr ?? '').split('\n')
    throw new Error(`FFmpeg error:\n${lines.slice(-5).join('\n')}`)
  }
}

function generateAssSubtitles(outputPath: string, words: Word[], baseTime: number): void {
  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'PlayResX: 1080',
    'PlayResY: 1920',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Default,Arial,72,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,20,20,80,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ]

  const dialogues: string[] = []
  const chunkSize = 3
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize)
    const tStart = Math.max(0, chunk[0].start - baseTime)
    const tEnd = Math.max(tStart + 0.1, chunk[chunk.length - 1].end - baseTime)
    const text = chunk.map((w) => w.word).join(' ')
    dialogues.push(`Dialogue: 0,${toAssTime(tStart)},${toAssTime(tEnd)},Default,,0,0,0,,${text}`)
  }

  fs.writeFileSync(outputPath, [...header, ...dialogues].join('\n'), 'utf-8')
}

function toAssTime(sec: number): string {
  const totalSec = Math.max(0, sec)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = Math.floor(totalSec % 60)
  const cs = Math.floor((totalSec % 1) * 100)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

export async function exportClip(clipId: string): Promise<{ ok: boolean; path?: string }> {
  const clip = getClip(clipId)
  if (!clip) return { ok: false }

  if (clip.output_path && fs.existsSync(clip.output_path)) {
    return { ok: true, path: clip.output_path }
  }

  const job = getJob(clip.job_id)
  if (!job) return { ok: false }

  const metadata = job.metadata as any
  const videoPath: string = metadata?.actual_path ?? job.source_path
  const words = getWords(clip.job_id)
  const settings = getSettings()

  fs.mkdirSync(settings.outputFolder, { recursive: true })
  await processClip(clip, words, videoPath, settings.outputFolder, metadata)

  return { ok: true, path: clip.output_path }
}
