export type JobStatus =
  | 'pending'
  | 'ingesting'
  | 'transcribing'
  | 'analysing'
  | 'detecting'
  | 'assembling'
  | 'done'
  | 'error'

export type ClipStatus = 'pending' | 'approved' | 'rejected' | 'exported'

export interface Job {
  id: string
  source_path: string
  status: JobStatus
  created_at: number
  error_message?: string
  metadata?: VideoMetadata
}

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  fps: number
  codec: string
  size: number
  actual_path?: string
}

export interface Word {
  job_id: string
  idx: number
  word: string
  start: number
  end: number
  is_loud: number
  after_scene_cut: number
}

export interface Clip {
  id: string
  job_id: string
  start_word_idx: number
  end_word_idx: number
  start_time: number
  end_time: number
  score: number
  hook: string
  reason: string
  output_path: string
  status: ClipStatus
}

export interface ProgressEvent {
  jobId: string
  stage: 'ingest' | 'transcribe' | 'analyse' | 'detect' | 'assemble'
  percent: number
  message: string
}

export interface Settings {
  apiKey: string
  apiBaseUrl: string
  asrModel: 'sensevoice' | 'whisper-large'
  outputFolder: string
  llmModel: string
}

export interface ModelInfo {
  name: string
  displayName: string
  sizeMB: number
  url: string
  downloaded: boolean
}
