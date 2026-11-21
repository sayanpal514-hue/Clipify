import React, { useEffect, useState } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'
import type { ModelInfo } from '@shared/types'

interface Props {
  onBack: () => void
}

export default function Settings({ onBack }: Props): React.ReactElement {
  const { settings, load, save } = useSettingsStore()
  const [models, setModels] = useState<ModelInfo[]>([])
  const [downloading, setDownloading] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    load()
    window.clipify.model.list().then(setModels)
  }, [])

  const handleSave = async (key: string, value: string): Promise<void> => {
    await save(key, value)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDownload = async (name: string): Promise<void> => {
    setDownloading(name)
    try {
      await window.clipify.model.download(name)
      const updated = await window.clipify.model.list()
      setModels(updated)
    } finally {
      setDownloading(null)
    }
  }

  const handleOutputFolder = async (): Promise<void> => {
    const folder = await window.clipify.dialog.openFolder()
    if (folder) await handleSave('outputFolder', folder)
  }

  if (!settings) {
    return (
      <div style={{ padding: 32, color: 'var(--text-muted)' }}>Loading settings…</div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--surface2)',
    color: 'var(--text)',
    fontSize: 14,
    outline: 'none',
  }

  const sectionStyle: React.CSSProperties = {
    background: 'var(--surface)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    border: '1px solid var(--border)',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  }

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: 32,
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 28,
          }}
        >
          <button
            onClick={onBack}
            style={{
              padding: '5px 12px',
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
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Settings</h1>
          {saved && (
            <span style={{ color: 'var(--success)', fontSize: 13, marginLeft: 'auto' }}>
              ✓ Saved
            </span>
          )}
        </div>

        {/* ── LLM ──────────────────────────────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>AI / LLM</h2>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>API Key</label>
            <input
              type="password"
              defaultValue={settings.apiKey}
              placeholder="sk-… or your provider key"
              style={inputStyle}
              onBlur={(e) => {
                if (e.target.value !== settings.apiKey)
                  handleSave('apiKey', e.target.value)
              }}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
              Encrypted with OS keychain. Works with OpenAI, Groq, Together, LM Studio, Ollama.
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>API Base URL</label>
            <input
              type="text"
              defaultValue={settings.apiBaseUrl}
              placeholder="https://api.openai.com/v1"
              style={inputStyle}
              onBlur={(e) => {
                if (e.target.value !== settings.apiBaseUrl)
                  handleSave('apiBaseUrl', e.target.value)
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>Model</label>
            <input
              type="text"
              defaultValue={settings.llmModel}
              placeholder="gpt-4o"
              style={inputStyle}
              onBlur={(e) => {
                if (e.target.value !== settings.llmModel)
                  handleSave('llmModel', e.target.value)
              }}
            />
          </div>
        </section>

        {/* ── ASR Models ──────────────────────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
            Speech Recognition (ASR)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            Models run 100% locally via sherpa-onnx. Download once, use forever.
          </p>

          {models.map((model) => (
            <div
              key={model.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <input
                type="radio"
                name="asrModel"
                value={model.name}
                checked={settings.asrModel === model.name}
                onChange={() => handleSave('asrModel', model.name)}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16, flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{model.displayName}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                  {model.sizeMB >= 1000
                    ? `${(model.sizeMB / 1024).toFixed(1)} GB`
                    : `${model.sizeMB} MB`}
                </div>
              </div>
              {model.downloaded ? (
                <span
                  style={{
                    color: 'var(--success)',
                    fontSize: 12,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  ✓ Ready
                </span>
              ) : (
                <button
                  onClick={() => handleDownload(model.name)}
                  disabled={downloading === model.name}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 6,
                    border: 'none',
                    background:
                      downloading === model.name ? 'var(--surface2)' : 'var(--accent)',
                    color: '#fff',
                    cursor: downloading === model.name ? 'wait' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {downloading === model.name ? 'Preparing…' : 'Set Up'}
                </button>
              )}
            </div>
          ))}

          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 14, lineHeight: 1.6 }}>
            After clicking "Set Up", a README.txt will appear in your model directory with the
            download URL. Extract the archive there and restart Clipify.
          </p>
        </section>

        {/* ── Output ──────────────────────────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Output</h2>
          <div>
            <label style={labelStyle}>Output Folder</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={settings.outputFolder}
                readOnly
                style={{ ...inputStyle, flex: 1, cursor: 'default', color: 'var(--text-muted)' }}
              />
              <button
                onClick={handleOutputFolder}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface2)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Browse…
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
