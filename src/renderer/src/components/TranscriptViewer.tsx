import React, { useMemo, useRef, useEffect } from 'react'
import type { Word, Clip } from '@shared/types'

interface Props {
  words: Word[]
  clips: Clip[]
}

export default function TranscriptViewer({ words, clips }: Props): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)

  // Build a set of word indices that belong to any approved clip
  const approvedIdxs = useMemo(() => {
    const set = new Set<number>()
    for (const clip of clips) {
      if (clip.status === 'approved' || clip.status === 'exported') {
        for (let i = clip.start_word_idx; i <= clip.end_word_idx; i++) {
          set.add(i)
        }
      }
    }
    return set
  }, [clips])

  if (words.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 14,
          padding: 24,
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        Transcript will appear here once transcription completes.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px 16px',
        lineHeight: 2,
        fontSize: 13,
      }}
    >
      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        {[
          { color: 'rgba(99,102,241,0.3)', label: 'Approved clip' },
          { color: '#fbbf24', label: 'Loud' },
          { color: '#60a5fa', label: 'Scene cut' },
        ].map(({ color, label }) => (
          <span
            key={label}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 2,
                background: color,
                flexShrink: 0,
              }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* Words */}
      <div style={{ lineHeight: 2 }}>
        {words.map((w) => {
          const inApproved = approvedIdxs.has(w.idx)
          const isLoud = w.is_loud === 1
          const isCut = w.after_scene_cut === 1

          let color = 'var(--text)'
          if (isLoud) color = '#fbbf24'
          if (isCut) color = '#60a5fa'
          if (isLoud && isCut) color = '#c084fc'

          return (
            <span
              key={`${w.job_id}-${w.idx}`}
              title={[
                `idx: ${w.idx}`,
                `${w.start.toFixed(2)}s → ${w.end.toFixed(2)}s`,
                isLoud ? 'LOUD' : '',
                isCut ? 'SCENE CUT' : '',
              ]
                .filter(Boolean)
                .join(' · ')}
              style={{
                display: 'inline',
                background: inApproved ? 'rgba(99,102,241,0.22)' : 'transparent',
                color,
                borderRadius: 3,
                padding: '1px 1px',
                cursor: 'default',
                fontWeight: isLoud ? 600 : 400,
              }}
            >
              {w.word}{' '}
            </span>
          )
        })}
      </div>
    </div>
  )
}
