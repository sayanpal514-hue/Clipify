import type { BrowserWindow } from 'electron'
import { updateJobStatus } from './db'
import { ingest } from './ingest'
import { transcribe } from './transcribe'
import { analyse } from './analyse'
import { detect } from './detect'
import { assemble } from './assemble'
import type { ProgressEvent } from '../../shared/types'

export async function runPipeline(jobId: string, win: BrowserWindow): Promise<void> {
  const send = (stage: ProgressEvent['stage'], percent: number, message: string): void => {
    const evt: ProgressEvent = { jobId, stage, percent, message }
    win.webContents.send('job:progress', evt)
  }

  try {
    // Stage 1 – Ingest
    updateJobStatus(jobId, 'ingesting')
    send('ingest', 0, 'Starting ingest…')
    await ingest(jobId, (p, msg) => send('ingest', p, msg))

    // Stage 2 – Transcribe
    updateJobStatus(jobId, 'transcribing')
    send('transcribe', 0, 'Starting transcription…')
    await transcribe(jobId, (p, msg) => send('transcribe', p, msg))

    // Stage 3 – Signal analysis
    updateJobStatus(jobId, 'analysing')
    send('analyse', 0, 'Analysing audio and scenes…')
    await analyse(jobId, (p, msg) => send('analyse', p, msg))

    // Stage 4 – LLM clip detection
    updateJobStatus(jobId, 'detecting')
    send('detect', 0, 'Detecting viral clips with AI…')
    await detect(jobId, (p, msg) => send('detect', p, msg))

    // Stage 5 – Assemble
    updateJobStatus(jobId, 'assembling')
    send('assemble', 0, 'Assembling clips…')
    await assemble(jobId, (p, msg) => send('assemble', p, msg))

    updateJobStatus(jobId, 'done')
    send('assemble', 100, 'All clips ready!')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[Pipeline] Job ${jobId} failed:`, err)
    updateJobStatus(jobId, 'error', msg)
    send('ingest', 0, `Error: ${msg}`)
  }
}
