import { app } from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'

export function getBinPath(name: string): string {
  const ext = process.platform === 'win32' ? '.exe' : ''
  const binName = name + ext

  if (is.dev) {
    // In dev, look for binaries in resources/bin relative to project root
    return path.join(process.cwd(), 'resources', 'bin', binName)
  }
  // In production, binaries are in extraResources -> resources/bin
  return path.join(process.resourcesPath, 'bin', binName)
}
