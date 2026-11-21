import React, { useEffect, useState } from 'react'
import { useJobStore } from '../store/useJobStore'
import ClipCard from '../components/ClipCard'
import TranscriptViewer from '../components/TranscriptViewer'
import ProgressBar from '../components/ProgressBar'
import VideoPlayer from '../components/VideoPlayer'
import type { Clip } from '@shared/types'

interface Props {
  jobId: string
  onBack: () => void
}

const STAGE_MAP: Record<string, number> = {
  ingest: 0,
  transcribe: 1,
  analyse: 2,
  detect: 3,
  assemble: 4,
}

export default function Job({ jobId, onBack }: Props): React.ReactElement {
  const { jobs, clips, words, progress, refreshClips, setWords } = useJobStore()
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [activeWatchingClip, setActiveWatchingClip] = useState<Clip | null>(null)

  const job = jobs.find((j) => j.id === jobId)
  const jobClips = clips[jobId] ?? []
  const jobWords = words[jobId] ?? []
  const jobProgress = progress[jobId]

  const approvedClips = jobClips.filter(
    (c) => c.status === 'approved' || c.status === 'exported'
  )
  const isRunning =
    job && !['done', 'error', 'pending'].includes(job.status ?? '')

  useEffect(() => {
    const load = async (): Promise<void> => {
      await refreshClips(jobId)
      const ws = await window.clipify.job.words(jobId)
      setWords(jobId, ws)
    }
    load()
    const timer = setInterval(load, 3000)
    return () => clearInterval(timer)
  }, [jobId])

  const handleApprove = async (clipId: string): Promise<void> => {
    await window.clipify.clip.approve(clipId)
    await refreshClips(jobId)
  }

  const handleReject = async (clipId: string): Promise<void> => {
    await window.clipify.clip.reject(clipId)
    await refreshClips(jobId)
  }

  const handleExportAll = async (): Promise<void> => {
    setExporting(true)
    setExportError(null)
    try {
      for (const clip of approvedClips) {
        await window.clipify.clip.export(clip.id)
      }
      await refreshClips(jobId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed'
      setExportError(msg)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--surface)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: '5px 11px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          ← Back
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {job?.source_path.split(/[/\\]/).pop() ?? jobId}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {job?.status} · {jobClips.length} clip{jobClips.length !== 1 ? 's' : ''} · {jobWords.length} words
          </div>
        </div>

        <button
          onClick={handleExportAll}
          disabled={approvedClips.length === 0 || exporting}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            background:
              approvedClips.length === 0 || exporting
                ? 'var(--surface2)'
                : 'var(--accent)',
            color: approvedClips.length === 0 ? 'var(--text-muted)' : '#fff',
            cursor:
              approvedClips.length === 0 || exporting ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: 14,
            transition: 'background 0.2s',
          }}
        >
          {exporting
            ? 'Exporting…'
            : `Export ${approvedClips.length} Clip${approvedClips.length !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* ── Progress Bar ─────────────────────────────────────────────── */}
      {isRunning && jobProgress && (
        <ProgressBar
          stages={['Ingest', 'Transcribe', 'Analyse', 'Detect', 'Assemble']}
          currentStage={STAGE_MAP[jobProgress.stage] ?? 0}
          percent={jobProgress.percent}
          message={jobProgress.message}
        />
      )}

      {/* ── Error banner ─────────────────────────────────────────────── */}
      {(job?.status === 'error' || exportError) && (
        <div
          style={{
            margin: '12px 16px 0',
            padding: '12px 16px',
            borderRadius: 8,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          ⚠ {exportError ?? job?.error_message ?? 'An error occurred'}
        </div>
      )}

      {/* ── Main 2-panel layout ──────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Transcript */}
        <div
          style={{
            width: 340,
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--text-muted)',
              flexShrink: 0,
            }}
          >
            TRANSCRIPT · {jobWords.length} words
          </div>
          <TranscriptViewer words={jobWords} clips={jobClips} />
        </div>

        {/* Right: Clips */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Video Player Modal/Inline when watching a clip */}
          {activeWatchingClip && (
            <div
              style={{
                background: 'var(--surface2)',
                borderRadius: 14,
                border: '1px solid var(--accent)',
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <div>
                  <span
                    style={{
                      fontWeight: 800,
                      color: 'var(--accent)',
                      fontSize: 14,
                      marginRight: 8,
                    }}
                  >
                    ▶ Watching Clip
                  </span>
                  <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
                    "{activeWatchingClip.hook}"
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>
                    ({activeWatchingClip.start_time.toFixed(1)}s →{' '}
                    {activeWatchingClip.end_time.toFixed(1)}s)
                  </span>
                </div>
                <button
                  onClick={() => setActiveWatchingClip(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    borderRadius: 6,
                    padding: '3px 8px',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  ✕ Close Player
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  background: '#000',
                  borderRadius: 10,
                  overflow: 'hidden',
                  maxHeight: 400,
                }}
              >
                {activeWatchingClip.output_path ? (
                  <video
                    key={activeWatchingClip.id}
                    controls
                    autoPlay
                    src={activeWatchingClip.output_path}
                    style={{
                      maxHeight: 380,
                      width: 'auto',
                      maxWidth: '100%',
                      borderRadius: 8,
                      border: '1px solid #333',
                    }}
                  />
                ) : (
                  <iframe
                    key={activeWatchingClip.id}
                    src={`https://www.youtube.com/embed/l2_pKB1EbMQ?start=${Math.floor(activeWatchingClip.start_time)}&autoplay=1&rel=0`}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{
                      height: 480,
                      width: 270,
                      borderRadius: 8,
                      border: '1px solid #333',
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {jobClips.length === 0 && !isRunning && (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--text-muted)',
                marginTop: 60,
                fontSize: 15,
              }}
            >
              {job?.status === 'done'
                ? 'No clips were detected. Try adjusting your video or LLM settings.'
                : 'Processing video…'}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {jobClips.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                isPlaying={activeWatchingClip?.id === clip.id}
                onPlay={() =>
                  setActiveWatchingClip(
                    activeWatchingClip?.id === clip.id ? null : clip
                  )
                }
                onApprove={() => handleApprove(clip.id)}
                onReject={() => handleReject(clip.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
