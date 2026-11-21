import React from 'react'
import type { Clip } from '@shared/types'

interface Props {
  clip: Clip
  onApprove: () => void
  onReject: () => void
  onPlay?: () => void
  isPlaying?: boolean
}

function scoreColor(score: number): string {
  if (score >= 85) return '#22c55e'
  if (score >= 65) return '#f59e0b'
  return '#71717a'
}

function scoreLabel(score: number): string {
  if (score >= 85) return 'SUPER VIRAL'
  if (score >= 70) return 'HIGH IMPACT'
  if (score >= 55) return 'VIRAL'
  return 'GOOD'
}

export default function ClipCard({ clip, onApprove, onReject, onPlay, isPlaying }: Props): React.ReactElement {
  const duration = clip.end_time - clip.start_time
  const isApproved = clip.status === 'approved'
  const isRejected = clip.status === 'rejected'
  const isExported = clip.status === 'exported'
  const color = scoreColor(clip.score)

  const fmt = (sec: number): string => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: `1px solid ${
          isExported
            ? 'var(--success)'
            : isApproved
            ? 'var(--accent)'
            : isRejected
            ? '#2d2d2d'
            : 'var(--border)'
        }`,
        borderRadius: 12,
        padding: '16px 18px',
        opacity: isRejected ? 0.45 : 1,
        transition: 'all 0.2s',
      }}
    >
      {/* ── Top row ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* Score badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 20,
            background: `${color}18`,
            border: `1px solid ${color}44`,
          }}
        >
          <span style={{ color, fontWeight: 800, fontSize: 14 }}>{clip.score}</span>
          <span style={{ color: `${color}bb`, fontSize: 11, fontWeight: 600 }}>
            {scoreLabel(clip.score)}
          </span>
        </div>

        {/* Duration + timestamps */}
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {duration.toFixed(1)}s &nbsp;·&nbsp; {fmt(clip.start_time)} → {fmt(clip.end_time)}
        </span>

        {/* Exported badge */}
        {isExported && (
          <span
            style={{
              marginLeft: 'auto',
              color: 'var(--success)',
              fontSize: 12,
              fontWeight: 600,
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.3)',
              padding: '2px 8px',
              borderRadius: 20,
            }}
          >
            ✓ Exported
          </span>
        )}
      </div>

      {/* ── Hook ───────────────────────────────────────────────── */}
      {clip.hook && (
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: 8,
            lineHeight: 1.45,
          }}
        >
          "{clip.hook}"
        </div>
      )}

      {/* ── Reason ─────────────────────────────────────────────── */}
      {clip.reason && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          {clip.reason}
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {onPlay && (
          <button
            onClick={onPlay}
            style={{
              padding: '7px 16px',
              borderRadius: 7,
              border: '1px solid var(--accent)',
              background: isPlaying ? 'var(--accent)' : 'rgba(99,102,241,0.15)',
              color: isPlaying ? '#fff' : 'var(--accent)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
            }}
          >
            {isPlaying ? '⏸ Watching' : '▶ Watch Clip'}
          </button>
        )}

        {/* Download direct MP4 option */}
        {clip.output_path && (
          <a
            href={clip.output_path}
            download={`clip_${clip.id}_${Math.round(duration)}s.mp4`}
            style={{
              padding: '7px 16px',
              borderRadius: 7,
              border: '1px solid #22c55e',
              background: 'rgba(34,197,94,0.15)',
              color: '#22c55e',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            ⬇ Download MP4 ({duration.toFixed(0)}s)
          </a>
        )}

        {!isExported && (
          <>
            <button
              onClick={onApprove}
              style={{
                padding: '7px 18px',
                borderRadius: 7,
                border: 'none',
                background: isApproved
                  ? 'var(--accent)'
                  : 'rgba(99,102,241,0.12)',
                color: isApproved ? '#fff' : 'var(--accent)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13,
                transition: 'background 0.15s',
              }}
            >
              {isApproved ? '✓ Approved' : 'Approve'}
            </button>

            <button
              onClick={onReject}
              style={{
                padding: '7px 16px',
                borderRadius: 7,
                border: `1px solid ${isRejected ? '#ef444455' : 'var(--border)'}`,
                background: 'transparent',
                color: isRejected ? 'var(--danger)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 13,
                transition: 'color 0.15s',
              }}
            >
              {isRejected ? '✗ Rejected' : 'Reject'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
