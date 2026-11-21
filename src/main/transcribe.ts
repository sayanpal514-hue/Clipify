import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { getJob, insertWords } from './db'
import { getBinPath } from './bin'
import { getModelsDir } from './models'
import { getSettings } from './settings'
import type { Word } from '../../shared/types'

const execFileAsync = promisify(execFile)

export async function transcribe(
  jobId: string,
  onProgress: (percent: number, msg: string) => void
): Promise<void> {
  const job = getJob(jobId)
  if (!job) throw new Error(`Job ${jobId} not found`)

  const metadata = job.metadata as any
  const videoPath: string = metadata?.actual_path ?? job.source_path

  const tmpDir = path.join(app.getPath('temp'), 'clipify', jobId)
  fs.mkdirSync(tmpDir, { recursive: true })
  const wavPath = path.join(tmpDir, 'audio.wav')

  onProgress(10, 'Extracting audio track…')
  await extractAudio(videoPath, wavPath)

  const settings = getSettings()
  const modelName = settings.asrModel
  const modelDir = path.join(getModelsDir(), modelName)

  if (!fs.existsSync(modelDir)) {
    throw new Error(
      `ASR model "${modelName}" not found at ${modelDir}.\n` +
        'Please open Settings → Speech Recognition and follow the download instructions.'
    )
  }

  onProgress(25, `Loading ${modelName} model…`)

  let words: Word[]
  try {
    words = await runSherpaOnnx(jobId, wavPath, modelDir, modelName, onProgress)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[Transcribe] sherpa-onnx failed, falling back to segment mode:', msg)
    words = fallbackSegmentation(jobId, wavPath)
  }

  onProgress(90, `Storing ${words.length} words…`)
  insertWords(words)
  onProgress(100, `Transcription complete — ${words.length} words`)
}

async function extractAudio(inputPath: string, outputWav: string): Promise<void> {
  const ffmpeg = getBinPath('ffmpeg')
  try {
    await execFileAsync(ffmpeg, [
      '-y', '-i', inputPath,
      '-ar', '16000', '-ac', '1', '-f', 'wav',
      outputWav,
    ])
  } catch (err: any) {
    const lines: string[] = (err.stderr ?? '').split('\n')
    throw new Error(`FFmpeg audio extraction failed:\n${lines.slice(-5).join('\n')}`)
  }
}

async function runSherpaOnnx(
  jobId: string,
  wavPath: string,
  modelDir: string,
  modelName: string,
  onProgress: (p: number, msg: string) => void
): Promise<Word[]> {
  // Dynamic import — will throw if sherpa-onnx is not installed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sherpa = require('sherpa-onnx')

  const files = fs.readdirSync(modelDir)
  let config: object

  if (modelName === 'sensevoice') {
    const onnxFile = files.find((f) => f.endsWith('.onnx')) ?? 'model.onnx'
    const tokensFile = files.find((f) => f.includes('tokens')) ?? 'tokens.txt'
    config = {
      model: {
        senseVoice: {
          model: path.join(modelDir, onnxFile),
          tokens: path.join(modelDir, tokensFile),
          useInverseTextNormalization: 1,
        },
        numThreads: 4,
        debug: 0,
        provider: 'cpu',
      },
    }
  } else {
    // whisper-large
    const encoderFile = files.find((f) => f.includes('encoder') && f.endsWith('.onnx')) ?? 'encoder.onnx'
    const decoderFile = files.find((f) => f.includes('decoder') && f.endsWith('.onnx')) ?? 'decoder.onnx'
    const tokensFile = files.find((f) => f.includes('tokens')) ?? 'tokens.txt'
    config = {
      model: {
        whisper: {
          encoder: path.join(modelDir, encoderFile),
          decoder: path.join(modelDir, decoderFile),
          tokens: path.join(modelDir, tokensFile),
          language: 'en',
          task: 'transcribe',
        },
        numThreads: 4,
        debug: 0,
        provider: 'cpu',
      },
    }
  }

  onProgress(40, 'Running speech recognition…')

  const recognizer = new sherpa.OfflineRecognizer(config)
  const stream = recognizer.createStream()

  // Parse WAV header and feed samples
  const wavBuf = fs.readFileSync(wavPath)
  const sampleRate: number = wavBuf.readUInt32LE(24)
  const dataOffset = 44
  const numSamples = (wavBuf.length - dataOffset) / 2
  const samples = new Float32Array(numSamples)
  for (let i = 0; i < numSamples; i++) {
    samples[i] = wavBuf.readInt16LE(dataOffset + i * 2) / 32768.0
  }

  stream.acceptWaveform({ sampleRate, samples })
  recognizer.decode(stream)
  const result = recognizer.getResult(stream)

  onProgress(80, 'Parsing word timestamps…')
  const words: Word[] = []

  if (result?.tokens && Array.isArray(result.tokens)) {
    result.tokens.forEach((token: any, idx: number) => {
      const w: string = (token.token ?? '').trim()
      if (w) {
        words.push({
          job_id: jobId,
          idx,
          word: w,
          start: token.start ?? 0,
          end: token.end ?? (token.start ?? 0) + 0.3,
          is_loud: 0,
          after_scene_cut: 0,
        })
      }
    })
  } else if (result?.text) {
    // No token-level timestamps — distribute evenly
    const wordList: string[] = result.text.trim().split(/\s+/).filter(Boolean)
    const totalDuration = numSamples / sampleRate
    const wordDur = totalDuration / (wordList.length || 1)
    wordList.forEach((w, idx) => {
      words.push({
        job_id: jobId,
        idx,
        word: w,
        start: idx * wordDur,
        end: (idx + 1) * wordDur,
        is_loud: 0,
        after_scene_cut: 0,
      })
    })
  }

  return words
}

function fallbackSegmentation(jobId: string, wavPath: string): Word[] {
  const wavBuf = fs.readFileSync(wavPath)
  const sampleRate: number = wavBuf.readUInt32LE(24)
  const dataOffset = 44
  const totalSamples = (wavBuf.length - dataOffset) / 2
  const duration = totalSamples / sampleRate

  const words: Word[] = []
  const intervalSec = 2
  let idx = 0
  for (let t = 0; t < duration; t += intervalSec, idx++) {
    words.push({
      job_id: jobId,
      idx,
      word: `[${t.toFixed(1)}s]`,
      start: t,
      end: Math.min(t + intervalSec, duration),
      is_loud: 0,
      after_scene_cut: 0,
    })
  }
  return words
}
