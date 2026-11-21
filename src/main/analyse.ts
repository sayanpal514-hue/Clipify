import { getJob, getWords, updateWordSignals } from './db'
import { getBinPath } from './bin'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function analyse(
  jobId: string,
  onProgress: (percent: number, msg: string) => void
): Promise<void> {
  const job = getJob(jobId)
  if (!job) throw new Error(`Job ${jobId} not found`)

  const metadata = job.metadata as any
  const videoPath: string = metadata?.actual_path ?? job.source_path

  const words = getWords(jobId)
  if (!words.length) throw new Error('No words found — transcription may have failed')

  onProgress(10, 'Measuring loudness with EBU R128…')
  const loudWords = await measureLoudness(videoPath, words)

  onProgress(55, 'Detecting scene cuts…')
  const sceneCuts = await detectSceneCuts(videoPath)
  onProgress(75, `Found ${sceneCuts.length} scene cut(s)`)

  onProgress(80, 'Flagging signal words…')
  for (const word of words) {
    const isLoud = loudWords.has(word.idx) ? 1 : 0
    const afterCut = sceneCuts.some((ct) => Math.abs(ct - word.start) < 2.0) ? 1 : 0
    if (isLoud !== word.is_loud || afterCut !== word.after_scene_cut) {
      updateWordSignals(jobId, word.idx, isLoud, afterCut)
    }
  }

  onProgress(100, 'Analysis complete')
}

async function measureLoudness(
  videoPath: string,
  words: Array<{ idx: number; start: number }>
): Promise<Set<number>> {
  const ffmpeg = getBinPath('ffmpeg')
  let stderrOutput = ''

  try {
    await execFileAsync(ffmpeg, [
      '-i', videoPath,
      '-af', 'ebur128=framelog=verbose',
      '-f', 'null', '-',
    ])
  } catch (err: any) {
    stderrOutput = err.stderr ?? ''
  }

  if (!stderrOutput) return new Set()

  // Parse per-frame LUFS values from ebur128 output
  const frames: Array<{ t: number; lufs: number }> = []
  const frameRe = /t:\s*([\d.]+)\s+M:\s*([-\d.inf]+)/g
  let m: RegExpExecArray | null
  while ((m = frameRe.exec(stderrOutput)) !== null) {
    const lufs = parseFloat(m[2])
    if (isFinite(lufs)) frames.push({ t: parseFloat(m[1]), lufs })
  }

  if (!frames.length) return new Set()

  const avg = frames.reduce((s, f) => s + f.lufs, 0) / frames.length
  const threshold = avg + 6 // +6 LUFS above average

  const loudIdxs = new Set<number>()
  for (const word of words) {
    const nearFrames = frames.filter((f) => Math.abs(f.t - word.start) <= 0.5)
    if (nearFrames.some((f) => f.lufs >= threshold)) loudIdxs.add(word.idx)
  }
  return loudIdxs
}

async function detectSceneCuts(videoPath: string): Promise<number[]> {
  const ffmpeg = getBinPath('ffmpeg')
  let stderrOutput = ''

  try {
    await execFileAsync(ffmpeg, [
      '-i', videoPath,
      '-vf', 'select=gt(scene\\,0.3),showinfo',
      '-an', '-f', 'null', '-',
    ])
  } catch (err: any) {
    stderrOutput = err.stderr ?? ''
  }

  const cuts: number[] = []
  // Parse "pts_time:12.34" from showinfo filter output
  const ptsRe = /pts_time:([\d.]+)/g
  let m: RegExpExecArray | null
  while ((m = ptsRe.exec(stderrOutput)) !== null) {
    cuts.push(parseFloat(m[1]))
  }

  return [...new Set(cuts)].sort((a, b) => a - b)
}
