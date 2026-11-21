import { safeStorage } from 'electron'
import { getSetting, setSetting } from './db'
import type { Settings } from '../../shared/types'
import path from 'path'
import os from 'os'

const ENCRYPTED_KEYS = new Set(['apiKey'])

export function getSettings(): Settings {
  const decrypt = (key: string, fallback: string): string => {
    const raw = getSetting(key)
    if (!raw) return fallback
    if (ENCRYPTED_KEYS.has(key) && safeStorage.isEncryptionAvailable()) {
      try {
        return safeStorage.decryptString(Buffer.from(raw, 'base64'))
      } catch {
        return raw
      }
    }
    return raw
  }

  return {
    apiKey: decrypt('apiKey', ''),
    apiBaseUrl: decrypt('apiBaseUrl', 'https://api.openai.com/v1'),
    asrModel: (getSetting('asrModel') as 'sensevoice' | 'whisper-large') ?? 'sensevoice',
    outputFolder: getSetting('outputFolder') ?? path.join(os.homedir(), 'Desktop', 'Clipify'),
    llmModel: getSetting('llmModel') ?? 'gpt-4o',
  }
}

export function setSettingValue(key: string, value: string): void {
  if (ENCRYPTED_KEYS.has(key) && safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value)
    setSetting(key, encrypted.toString('base64'))
  } else {
    setSetting(key, value)
  }
}
