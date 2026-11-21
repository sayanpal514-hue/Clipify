import React, { useEffect, useState } from 'react'
import { useJobStore } from './store/useJobStore'
import Home from './pages/Home'
import Job from './pages/Job'
import Settings from './pages/Settings'
import type { ProgressEvent } from '@shared/types'

type Page = 'home' | 'job' | 'settings'

export default function App(): React.ReactElement {
  const [page, setPage] = useState<Page>('home')
  const { setActiveJob, setProgress, refreshJobs, activeJobId } = useJobStore()

  useEffect(() => {
    refreshJobs()
    const off = window.clipify.on('job:progress', (evt: ProgressEvent) => {
      setProgress(evt)
      // Refresh job list to pick up status changes
      refreshJobs()
    })
    return off
  }, [])

  const goToJob = (id: string): void => {
    setActiveJob(id)
    setPage('job')
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* ── Title Bar ──────────────────────────────────────────────────── */}
      <header
        style={{
          height: 48,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          flexShrink: 0,
          WebkitAppRegion: 'drag' as any,
          userSelect: 'none',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            WebkitAppRegion: 'no-drag' as any,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 15,
              color: '#fff',
              letterSpacing: '-0.5px',
            }}
          >
            C
          </div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Clipify</span>
        </div>

        {/* Nav */}
        <nav
          style={{
            display: 'flex',
            gap: 2,
            marginLeft: 16,
            WebkitAppRegion: 'no-drag' as any,
          }}
        >
          {(['home', 'job', 'settings'] as Page[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                if (p === 'job' && !activeJobId) return
                setPage(p)
              }}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                background: page === p ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: page === p ? 'var(--accent)' : 'var(--text-muted)',
                cursor: p === 'job' && !activeJobId ? 'default' : 'pointer',
                fontSize: 13,
                fontWeight: 500,
                opacity: p === 'job' && !activeJobId ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </nav>

        <div style={{ marginLeft: 'auto', WebkitAppRegion: 'no-drag' as any }}>
          <button
            onClick={() => setPage('settings')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            ⚙ Settings
          </button>
        </div>
      </header>

      {/* ── Page Content ──────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'hidden' }}>
        {page === 'home' && <Home onSelectJob={goToJob} />}
        {page === 'job' && activeJobId && (
          <Job jobId={activeJobId} onBack={() => setPage('home')} />
        )}
        {page === 'settings' && <Settings onBack={() => setPage('home')} />}
      </main>
    </div>
  )
}
