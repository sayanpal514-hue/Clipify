import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

// Web preview fallback mock for window.clipify when running in standard browser outside Electron
if (typeof window !== 'undefined' && !window.clipify) {
  const mockJobs: any[] = [
    {
      id: 'job-sample-1',
      source_path: 'https://www.youtube.com/watch?v=l2_pKB1EbMQ',
      status: 'done',
      created_at: Date.now() - 3600000,
      metadata: { duration: 180, width: 1920, height: 1080, fps: 30, codec: 'h264', size: 45000000 }
    }
  ]

  const mockWords = [
    { job_id: 'job-sample-1', idx: 0, word: 'Most', start: 74.2, end: 74.5, is_loud: 1, after_scene_cut: 0 },
    { job_id: 'job-sample-1', idx: 1, word: 'developers', start: 74.5, end: 75.1, is_loud: 1, after_scene_cut: 0 },
    { job_id: 'job-sample-1', idx: 2, word: 'miss', start: 75.1, end: 75.4, is_loud: 0, after_scene_cut: 0 },
    { job_id: 'job-sample-1', idx: 3, word: 'this', start: 75.4, end: 75.7, is_loud: 0, after_scene_cut: 0 },
    { job_id: 'job-sample-1', idx: 4, word: 'completely.', start: 75.7, end: 76.3, is_loud: 1, after_scene_cut: 1 },
    { job_id: 'job-sample-1', idx: 5, word: 'Running', start: 76.4, end: 76.8, is_loud: 0, after_scene_cut: 0 },
    { job_id: 'job-sample-1', idx: 6, word: 'local', start: 76.8, end: 77.2, is_loud: 0, after_scene_cut: 0 },
    { job_id: 'job-sample-1', idx: 7, word: 'AI', start: 77.2, end: 77.6, is_loud: 1, after_scene_cut: 0 },
    { job_id: 'job-sample-1', idx: 8, word: 'inference', start: 77.6, end: 78.2, is_loud: 0, after_scene_cut: 0 },
    { job_id: 'job-sample-1', idx: 9, word: 'on', start: 78.2, end: 78.4, is_loud: 0, after_scene_cut: 0 },
    { job_id: 'job-sample-1', idx: 10, word: 'edge', start: 78.4, end: 78.9, is_loud: 0, after_scene_cut: 1 },
    { job_id: 'job-sample-1', idx: 11, word: 'silicon', start: 78.9, end: 79.5, is_loud: 0, after_scene_cut: 0 }
  ]

  const mockClips = [
    {
      id: 'clip-1',
      job_id: 'job-sample-1',
      start_word_idx: 0,
      end_word_idx: 11,
      start_time: 15.0,
      end_time: 35.0,
      score: 96,
      hook: 'Most developers miss this completely...',
      reason: 'High loudness spike (+8.4 LUFS) followed immediately by an attention-grabbing code architecture reveal.',
      output_path: '/clips/clip-1.mp4',
      status: 'approved' as const
    },
    {
      id: 'clip-2',
      job_id: 'job-sample-1',
      start_word_idx: 5,
      end_word_idx: 11,
      start_time: 74.0,
      end_time: 99.0,
      score: 92,
      hook: 'The 3 things AI agents will replace by 2026...',
      reason: 'Strong urgency hook, rapid vocal cadence (+7.2 LUFS), continuous eye-contact tracked via YuNet.',
      output_path: '/clips/clip-2.mp4',
      status: 'approved' as const
    },
    {
      id: 'clip-3',
      job_id: 'job-sample-1',
      start_word_idx: 8,
      end_word_idx: 11,
      start_time: 120.0,
      end_time: 142.0,
      score: 88,
      hook: 'Why your neural net is silently hallucinating...',
      reason: 'Surprise reveal transition at second 8 with zero dead silence. Quick retention loop.',
      output_path: '/clips/clip-3.mp4',
      status: 'approved' as const
    }
  ]

  const mockSettings = {
    apiKey: 'sk-mock-demo-key-123456789',
    apiBaseUrl: 'https://api.openai.com/v1',
    asrModel: 'sensevoice' as const,
    outputFolder: 'D:\\Clipify\\exports',
    llmModel: 'gpt-4o'
  }

  const mockModels = [
    { name: 'sensevoice', displayName: 'SenseVoice Small (170 MB, fast)', sizeMB: 170, url: '', downloaded: true },
    { name: 'whisper-large', displayName: 'Whisper Large v3 (1.5 GB, accurate)', sizeMB: 1500, url: '', downloaded: false }
  ]

  window.clipify = {
    job: {
      create: async (sourcePath: string) => {
        const newJob = {
          id: 'job-' + Date.now(),
          source_path: sourcePath,
          status: 'pending' as const,
          created_at: Date.now()
        }
        mockJobs.unshift(newJob)
        return newJob
      },
      start: async (jobId: string) => {
        const job = mockJobs.find((j) => j.id === jobId)
        if (job) job.status = 'done'
        return { started: true }
      },
      list: async () => [...mockJobs],
      get: async (jobId: string) => mockJobs.find((j) => j.id === jobId),
      clips: async (jobId: string) => mockClips.filter((c) => c.job_id === jobId || jobId.startsWith('job-')),
      words: async () => mockWords
    },
    clip: {
      approve: async (clipId: string) => {
        const c = mockClips.find((x) => x.id === clipId)
        if (c) c.status = 'approved'
        return { ok: true }
      },
      reject: async (clipId: string) => {
        const c = mockClips.find((x) => x.id === clipId)
        if (c) c.status = 'rejected'
        return { ok: true }
      },
      export: async (clipId: string) => {
        const c = mockClips.find((x) => x.id === clipId)
        if (c) c.status = 'exported'
        return { ok: true, path: 'D:\\Clipify\\exports\\clip_' + clipId + '.mp4' }
      }
    },
    settings: {
      get: async () => ({ ...mockSettings }),
      set: async (key: string, val: string) => {
        (mockSettings as any)[key] = val
        return { ok: true }
      }
    },
    model: {
      list: async () => mockModels,
      download: async (name: string) => {
        const m = mockModels.find((x) => x.name === name)
        if (m) m.downloaded = true
        return { ok: true }
      }
    },
    dialog: {
      openFile: async () => 'D:\\Videos\\sample_podcast.mp4',
      openFolder: async () => 'D:\\Clipify\\exports'
    },
    on: () => () => {},
    off: () => {}
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
