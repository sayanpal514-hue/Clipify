import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { getJob, updateJobMetadata } from './db'
import { getBinPath } from './bin'
import type { VideoMetadata } from '../../shared/types'

const execFileAsync = promisify(execFile)

export async function ingest(
  jobId: string,
  onProgress: (percent: number, msg: string) => void
): Promise<void> {
  const job = getJob(jobId)
  if (!job) throw new Error(`Job ${jobId} not found`)

  let videoPath = job.source_path

  // YouTube / URL download
  if (/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(videoPath)) {
    onProgress(10, 'Downloading video from YouTube…')
    const tmpDir = path.join(app.getPath('temp'), 'clipify', jobId)
    fs.mkdirSync(tmpDir, { recursive: true })
    const outTemplate = path.join(tmpDir, 'video.%(ext)s')
    const ytDlp = getBinPath('yt-dlp')
    try {
      await execFileAsync(ytDlp, [
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '-o', outTemplate,
        videoPath,
      ])
    } catch (err: any) {
      const stderr: string = err.stderr ?? ''
      throw new Error(`yt-dlp failed: ${stderr.split('\n').slice(-3).join(' ')}`)
    }
    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.mp4'))
    if (!files.length) throw new Error('yt-dlp produced no MP4 file')
    videoPath = path.join(tmpDir, files[0])
    onProgress(40, 'Download complete, probing metadata…')
  }

  onProgress(60, 'Extracting video metadata…')
  const metadata = await probeVideo(videoPath)
  updateJobMetadata(jobId, { ...metadata, actual_path: videoPath })
  onProgress(100, `Ingest complete — ${metadata.duration.toFixed(1)}s, ${metadata.width}x${metadata.height}`)
}

async function probeVideo(filePath: string): Promise<VideoMetadata> {
  const ffprobe = getBinPath('ffprobe')
  let stdout: string
  try {
    const result = await execFileAsync(ffprobe, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ])
    stdout = result.stdout
  } catch (err: any) {
    const lines: string[] = (err.stderr ?? '').split('\n')
    throw new Error(`FFprobe failed:\n${lines.slice(-5).join('\n')}`)
  }

  const info = JSON.parse(stdout)
  const videoStream = (info.streams ?? []).find((s: any) => s.codec_type === 'video')
  const format = info.format ?? {}

  if (!videoStream) throw new Error('No video stream found in file')

  const fpsStr: string = videoStream.r_frame_rate ?? '30/1'
  const [num, den] = fpsStr.split('/').map(Number)
  const fps = den ? num / den : Number(fpsStr)

  return {
    duration: parseFloat(format.duration ?? '0'),
    width: videoStream.width ?? 0,
    height: videoStream.height ?? 0,
    fps: Math.round(fps * 100) / 100,
    codec: videoStream.codec_name ?? 'unknown',
    size: parseInt(format.size ?? '0', 10),
  }
}
