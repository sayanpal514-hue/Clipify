import type { Job, Clip, Word, Settings, ModelInfo, ProgressEvent } from '../shared/types'

declare global {
  interface Window {
    clipify: {
      job: {
        create: (sourcePath: string) => Promise<Job>
        start: (jobId: string) => Promise<{ started: boolean }>
        list: () => Promise<Job[]>
        get: (jobId: string) => Promise<Job | undefined>
        clips: (jobId: string) => Promise<Clip[]>
        words: (jobId: string) => Promise<Word[]>
      }
      clip: {
        approve: (clipId: string) => Promise<{ ok: boolean }>
        reject: (clipId: string) => Promise<{ ok: boolean }>
        export: (clipId: string) => Promise<{ ok: boolean; path?: string }>
      }
      settings: {
        get: () => Promise<Settings>
        set: (key: string, value: string) => Promise<{ ok: boolean }>
      }
      model: {
        list: () => Promise<ModelInfo[]>
        download: (name: string) => Promise<{ ok: boolean }>
      }
      dialog: {
        openFile: () => Promise<string | null>
        openFolder: () => Promise<string | null>
      }
      on: (channel: string, callback: (...args: any[]) => void) => () => void
      off: (channel: string) => void
    }
  }
}
