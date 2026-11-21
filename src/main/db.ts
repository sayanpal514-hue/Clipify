import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import type { Job, Word, Clip } from '../../shared/types'

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'clipify.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema(db)
  }
  return db
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      source_path TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      error_message TEXT,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS words (
      job_id TEXT NOT NULL,
      idx INTEGER NOT NULL,
      word TEXT NOT NULL,
      start REAL NOT NULL,
      "end" REAL NOT NULL,
      is_loud INTEGER NOT NULL DEFAULT 0,
      after_scene_cut INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (job_id, idx)
    );

    CREATE TABLE IF NOT EXISTS clips (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      start_word_idx INTEGER NOT NULL,
      end_word_idx INTEGER NOT NULL,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      hook TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      output_path TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

export function insertJob(job: Omit<Job, 'metadata' | 'error_message'>): void {
  const db = getDb()
  db.prepare(`INSERT OR REPLACE INTO jobs (id, source_path, status, created_at) VALUES (?, ?, ?, ?)`)
    .run(job.id, job.source_path, job.status, job.created_at)
}

export function updateJobStatus(id: string, status: string, errorMessage?: string): void {
  const db = getDb()
  db.prepare(`UPDATE jobs SET status = ?, error_message = ? WHERE id = ?`)
    .run(status, errorMessage ?? null, id)
}

export function updateJobMetadata(id: string, metadata: object): void {
  const db = getDb()
  db.prepare(`UPDATE jobs SET metadata = ? WHERE id = ?`).run(JSON.stringify(metadata), id)
}

export function getJob(id: string): Job | undefined {
  const db = getDb()
  const row = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(id) as any
  if (!row) return undefined
  return { ...row, metadata: row.metadata ? JSON.parse(row.metadata) : undefined }
}

export function listJobs(): Job[] {
  const db = getDb()
  const rows = db.prepare(`SELECT * FROM jobs ORDER BY created_at DESC`).all() as any[]
  return rows.map((r) => ({ ...r, metadata: r.metadata ? JSON.parse(r.metadata) : undefined }))
}

export function insertWords(words: Word[]): void {
  const db = getDb()
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO words (job_id, idx, word, start, "end", is_loud, after_scene_cut) VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  const insertMany = db.transaction((ws: Word[]) => {
    for (const w of ws) stmt.run(w.job_id, w.idx, w.word, w.start, w.end, w.is_loud, w.after_scene_cut)
  })
  insertMany(words)
}

export function getWords(jobId: string): Word[] {
  const db = getDb()
  return db.prepare(`SELECT * FROM words WHERE job_id = ? ORDER BY idx`).all(jobId) as Word[]
}

export function updateWordSignals(jobId: string, idx: number, isLoud: number, afterCut: number): void {
  const db = getDb()
  db.prepare(`UPDATE words SET is_loud = ?, after_scene_cut = ? WHERE job_id = ? AND idx = ?`)
    .run(isLoud, afterCut, jobId, idx)
}

export function insertClip(clip: Clip): void {
  const db = getDb()
  db.prepare(
    `INSERT OR REPLACE INTO clips (id, job_id, start_word_idx, end_word_idx, start_time, end_time, score, hook, reason, output_path, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    clip.id, clip.job_id, clip.start_word_idx, clip.end_word_idx,
    clip.start_time, clip.end_time, clip.score, clip.hook, clip.reason,
    clip.output_path, clip.status
  )
}

export function getClips(jobId: string): Clip[] {
  const db = getDb()
  return db.prepare(`SELECT * FROM clips WHERE job_id = ? ORDER BY score DESC`).all(jobId) as Clip[]
}

export function getClip(id: string): Clip | undefined {
  const db = getDb()
  return db.prepare(`SELECT * FROM clips WHERE id = ?`).get(id) as Clip | undefined
}

export function updateClipStatus(id: string, status: string, outputPath?: string): void {
  const db = getDb()
  if (outputPath !== undefined) {
    db.prepare(`UPDATE clips SET status = ?, output_path = ? WHERE id = ?`).run(status, outputPath, id)
  } else {
    db.prepare(`UPDATE clips SET status = ? WHERE id = ?`).run(status, id)
  }
}

export function getSetting(key: string): string | undefined {
  const db = getDb()
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as any
  return row?.value
}

export function setSetting(key: string, value: string): void {
  const db = getDb()
  db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(key, value)
}
