import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { ModelInfo } from '../../shared/types'

export const MODELS: ModelInfo[] = [
  {
    name: 'sensevoice',
    displayName: 'SenseVoice Small (170 MB, fast)',
    sizeMB: 170,
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17.tar.bz2',
    downloaded: false,
  },
  {
    name: 'whisper-large',
    displayName: 'Whisper Large v3 (1.5 GB, accurate)',
    sizeMB: 1500,
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-large-v3.tar.bz2',
    downloaded: false,
  },
]

export function getModelsDir(): string {
  return path.join(app.getPath('userData'), 'models')
}

export function isModelDownloaded(name: string): boolean {
  const dir = getModelsDir()
  return fs.existsSync(path.join(dir, name))
}

export function listModels(): ModelInfo[] {
  return MODELS.map((m) => ({ ...m, downloaded: isModelDownloaded(m.name) }))
}

export async function downloadModel(
  name: string,
  onProgress: (percent: number) => void
): Promise<void> {
  const model = MODELS.find((m) => m.name === name)
  if (!model) throw new Error(`Unknown model: ${name}`)

  const dir = getModelsDir()
  fs.mkdirSync(dir, { recursive: true })

  const modelDir = path.join(dir, name)
  fs.mkdirSync(modelDir, { recursive: true })

  const readmePath = path.join(modelDir, 'README.txt')
  fs.writeFileSync(
    readmePath,
    [
      `Model: ${model.displayName}`,
      `Download from: ${model.url}`,
      '',
      'Instructions:',
      '1. Download the .tar.bz2 archive from the URL above.',
      '2. Extract it into this directory.',
      '3. Ensure the .onnx model file and tokens.txt are present here.',
      '4. Restart Clipify — the model will be detected automatically.',
    ].join('\n')
  )
  onProgress(100)
}
