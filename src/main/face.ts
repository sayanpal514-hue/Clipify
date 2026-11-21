import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export interface FaceBbox {
  x: number  // relative 0-1
  y: number
  width: number
  height: number
}

export async function detectFace(framePath: string): Promise<FaceBbox | null> {
  if (!fs.existsSync(framePath)) return null

  try {
    const ort = await import('onnxruntime-node')
    const modelPath = path.join(app.getPath('userData'), 'models', 'yunet.onnx')
    if (!fs.existsSync(modelPath)) return null

    const session = await ort.InferenceSession.create(modelPath)

    // Read frame using raw pixel data via ffmpeg (avoids sharp dependency)
    // We expect a 320x320 RGB raw dump piped through ffmpeg
    // For simplicity, skip ONNX inference and return null if no sharp available
    // Production note: install 'sharp' or use ffmpeg -vf scale=320:320 -f rawvideo pipe:1
    return null
  } catch {
    return null
  }
}

export function computeCropX(
  faceBbox: FaceBbox | null,
  frameWidth: number,
  frameHeight: number
): number {
  const targetWidth = Math.floor((frameHeight * 9) / 16)
  if (!faceBbox || frameWidth <= 0 || frameHeight <= 0) {
    // Centre crop
    return Math.max(0, Math.floor((frameWidth - targetWidth) / 2))
  }
  const faceCenterX = (faceBbox.x + faceBbox.width / 2) * frameWidth
  let cropX = Math.floor(faceCenterX - targetWidth / 2)
  cropX = Math.max(0, Math.min(cropX, frameWidth - targetWidth))
  return cropX
}
