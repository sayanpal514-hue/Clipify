import React from 'react'

interface Props {
  stages: string[]
  currentStage: number
  percent: number
  message: string
}

export default function ProgressBar({
  stages,
  currentStage,
  percent,
  message,
}: Props): React.ReactElement {
  // Overall progress: completed stages + current stage fraction
  const overallPct = ((currentStage + percent / 100) / stages.length) * 100

  return (
    <div
      style={{
        padding: '10px 20px 12px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      {/* Stage pills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          marginBottom: 10,
          flexWrap: 'wrap',
          rowGap: 6,
        }}
      >
        {stages.map((stage, i) => {
          const done = i < currentStage
          const active = i === currentStage
          return (
            <React.Fragment key={stage}>
              <div
                style={{
                  padding: '3px 11px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  transition: 'all 0.3s',
                  background: done
                    ? 'rgba(34,197,94,0.12)'
                    : active
                    ? 'rgba(99,102,241,0.18)'
                    : 'var(--surface2)',
                  color: done
                    ? 'var(--success)'
                    : active
                    ? 'var(--accent)'
                    : 'var(--text-muted)',
                  border: active
                    ? '1px solid rgba(99,102,241,0.5)'
                    : done
                    ? '1px solid rgba(34,197,94,0.3)'
                    : '1px solid transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                {done ? `✓ ${stage}` : active ? `⟳ ${stage}` : stage}
              </div>
              {i < stages.length - 1 && (
                <div
                  style={{
                    width: 20,
                    height: 1,
                    background: done ? 'var(--success)' : 'var(--border)',
                    flexShrink: 0,
                    opacity: 0.6,
                  }}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Track */}
      <div
        style={{
          background: 'var(--surface2)',
          borderRadius: 4,
          height: 5,
          overflow: 'hidden',
          marginBottom: 7,
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'var(--accent)',
            width: `${Math.min(100, overallPct)}%`,
            transition: 'width 0.4s ease',
            borderRadius: 4,
          }}
        />
      </div>

      {/* Message */}
      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{message}</div>
    </div>
  )
}
