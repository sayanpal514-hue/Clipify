import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useJobStore } from '../store/useJobStore'

interface Props {
  onSelectJob: (id: string) => void
}

const STATUS_COLOR: Record<string, string> = {
  done: 'var(--success)',
  error: 'var(--danger)',
  pending: 'var(--text-muted)',
}

function getStatusColor(status: string): string {
  return STATUS_COLOR[status] ?? 'var(--accent)'
}

export default function Home({ onSelectJob }: Props): React.ReactElement {
  const { jobs, refreshJobs } = useJobStore()
  const [isDragging, setIsDragging] = useState(false)
  const [creating, setCreating] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  useEffect(() => {
    refreshJobs()
    const timer = setInterval(refreshJobs, 3000)
    return () => clearInterval(timer)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (!file) return
      // Electron exposes the native path on the File object
      const filePath = (file as any).path as string
      if (filePath) await createJob(filePath)
    },
    []
  )

  const handleFileSelect = async (): Promise<void> => {
    const filePath = await window.clipify.dialog.openFile()
    if (filePath) await createJob(filePath)
  }

  const handleUrlSubmit = async (): Promise<void> => {
    const url = urlInput.trim()
    if (!url) return
    setUrlInput('')
    setShowUrlInput(false)
    await createJob(url)
  }

  const createJob = async (sourcePath: string): Promise<void> => {
    setCreating(true)
    try {
      const job = await window.clipify.job.create(sourcePath)
      await refreshJobs()
      await window.clipify.job.start(job.id)
      onSelectJob(job.id)
    } catch (err: unknown) {
      console.error('Failed to create job:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      style={{
        padding: 32,
        height: '100%',
        overflowY: 'auto',
        maxWidth: 800,
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Import Video</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 15 }}>
        Drop a file, browse, or paste a YouTube URL — Clipify handles the rest.
      </p>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={handleFileSelect}
        style={{
          border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 16,
          padding: '56px 32px',
          textAlign: 'center',
          cursor: creating ? 'wait' : 'pointer',
          transition: 'border-color 0.2s, background 0.2s',
          background: isDragging ? 'rgba(99,102,241,0.07)' : 'var(--surface)',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 12 }}>🎬</div>
        <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
          {creating ? 'Creating job…' : 'Drop video here or click to browse'}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          MP4 · MOV · MKV · AVI · WebM · M4V
        </p>
      </div>

      {/* YouTube URL input */}
      <div style={{ marginBottom: 36 }}>
        {!showUrlInput ? (
          <button
            onClick={() => setShowUrlInput(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            📎 Paste YouTube URL instead
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              placeholder="https://youtube.com/watch?v=..."
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid var(--accent)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <button
              onClick={handleUrlSubmit}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Import
            </button>
            <button
              onClick={() => setShowUrlInput(false)}
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Recent Jobs */}
      {jobs.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Recent Jobs
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => onSelectJob(job.id)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'border-color 0.15s',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: getStatusColor(job.status),
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {job.source_path.split(/[/\\]/).pop()}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    {new Date(job.created_at).toLocaleString()}
                    {job.metadata && ` · ${(job.metadata as any).duration?.toFixed(0)}s`}
                  </div>
                </div>
                <span
                  style={{
                    color: getStatusColor(job.status),
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    flexShrink: 0,
                  }}
                >
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {jobs.length === 0 && !creating && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 24, fontSize: 14 }}>
          No jobs yet — import a video to get started
        </div>
      )}
    </div>
  )
}
