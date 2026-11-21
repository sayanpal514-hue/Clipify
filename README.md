<div align="center">

# 🎬 Clipify

### Local-First AI Video Clipper — Your Personal OpusClip That Runs 100% Offline

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-31+-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-8.x-007808?logo=ffmpeg)](https://ffmpeg.org/)

> **Clipify** automatically finds the best 15–90 second viral clips from any long video using AI — completely locally, no cloud, no subscriptions, no data ever leaves your machine.

<video src="https://raw.githubusercontent.com/sayanpal514-hue/Clipify/main/src/renderer/public/clips/clip-1.mp4" controls autoplay muted loop width="100%">
  <a href="https://github.com/sayanpal514-hue/Clipify/blob/main/src/renderer/public/clips/clip-1.mp4">▶ Watch Demo Clip</a>
</video>

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Clip Detection** | Uses any OpenAI-compatible LLM (GPT-4o, Groq, Ollama, LM Studio) to find viral moments |
| 🎙️ **Local ASR** | Sherpa-onnx speech recognition (SenseVoice 170MB or Whisper Large 1.5GB) runs fully offline |
| 📊 **Signal Analysis** | EBU R128 loudness peaks + scene cut detection automatically flag high-energy moments |
| 📱 **9:16 Reframe** | Smart center-crop + YuNet face tracking for TikTok/Reels/Shorts output |
| 📝 **Subtitle Burn-in** | Word-level `.ass` subtitles auto-generated and burned into every clip |
| 🔊 **Audio Normalization** | EBU R128 / loudnorm to -14 LUFS for consistent, platform-ready audio |
| ⬇️ **Direct Download** | One-click MP4 download for every clip |
| 🔒 **100% Private** | Zero telemetry, encrypted API key storage via OS keychain |
| 📺 **YouTube Import** | Paste any YouTube URL — yt-dlp downloads it automatically |

---

## 🏗️ How It Works — The 5-Stage Pipeline

```
YouTube URL / Local File
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│  STAGE 1 — INGEST                                                │
│  • If YouTube URL: yt-dlp downloads best quality MP4             │
│  • FFprobe extracts: duration, resolution, fps, codec, filesize  │
│  • Stored in SQLite: jobs table                                  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  STAGE 2 — TRANSCRIBE                                            │
│  • FFmpeg extracts audio → 16kHz mono WAV                        │
│  • sherpa-onnx runs local ASR (SenseVoice or Whisper Large)      │
│  • Outputs word-level tokens with start/end timestamps           │
│  • Stored in SQLite: words table (idx, word, start, end)         │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  STAGE 3 — SIGNAL ANALYSIS                                       │
│  • FFmpeg ebur128 filter measures per-frame LUFS loudness        │
│  • Words near a loudness spike >+6 LUFS are flagged [LOUD]       │
│  • FFmpeg scene detection flags words near cuts as [CUT]         │
│  • Signals stored back to words table: is_loud, after_scene_cut  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  STAGE 4 — LLM DETECTION                                         │
│  • Annotated transcript built:                                   │
│    [0] Most (0.00s) [LOUD] [CUT]                                 │
│    [1] developers (0.50s) [LOUD]  ...                            │
│  • Sent to OpenAI-compatible API (temperature 0.3, json_object)  │
│  • LLM returns top 5 clips with score, hook, reason              │
│  • Auto-retry once if JSON parsing fails                         │
│  • Stored in SQLite: clips table                                 │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  STAGE 5 — ASSEMBLE (FFmpeg pipeline per clip)                   │
│  ① Cut: -ss {start-0.5} -t {duration+1} → raw.mp4               │
│  ② Frame extract → YuNet face detection → compute crop_x        │
│  ③ Reframe: crop=ih*9/16:ih:{crop_x}:0, scale=1080:1920         │
│  ④ Subtitle burn: generate .ass from word timestamps            │
│  ⑤ Loudness normalize: loudnorm=I=-14:TP=-1:LRA=11              │
│  → Output: 1080×1920 H.264 MP4, ready for TikTok/Reels/Shorts   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🖥️ UI Overview

### Home Screen
- **Drag & drop** zone for local video files (MP4, MOV, MKV, AVI, WebM)
- **YouTube URL** import — paste any URL and it downloads automatically
- **Recent jobs** list with status indicators

### Job Screen (2-panel layout)
| Left Panel | Right Panel |
|---|---|
| Word-by-word transcript | AI-detected clip cards |
| 🟨 Yellow = loud word | Score badge (0–100) |
| 🟦 Blue = scene cut | Hook sentence |
| 🟪 Purple = both signals | AI reasoning |
| Approved clips highlighted | ▶ Watch Clip inline player |
| — | ⬇ Download MP4 button |

### Settings Screen
- LLM API key (encrypted with OS keychain via `safeStorage`)
- API base URL (supports OpenAI, Groq, Together, LM Studio, Ollama)
- ASR model selector with download assistant
- Output folder picker

---

## 🗂️ Project Structure

```
Clipify/
├── resources/
│   ├── bin/                  # FFmpeg, FFprobe, yt-dlp static binaries (place here)
│   ├── models/               # Sherpa-onnx model directories (extracted here)
│   └── subtitles/
│       └── template.ass      # ASS subtitle template (Montserrat 72pt, 1080×1920)
├── src/
│   ├── shared/
│   │   ├── types.ts          # Shared TypeScript types (Job, Clip, Word, Settings…)
│   │   └── ipc.ts            # IPC channel name constants
│   ├── preload/
│   │   ├── index.ts          # Context bridge — exposes window.clipify API safely
│   │   └── index.d.ts        # TypeScript declarations for renderer
│   ├── main/                 # Electron main process (Node.js)
│   │   ├── index.ts          # App lifecycle, BrowserWindow, all ipcMain.handle()
│   │   ├── pipeline.ts       # 5-stage orchestrator with progress events
│   │   ├── ingest.ts         # Stage 1: FFprobe metadata + yt-dlp download
│   │   ├── transcribe.ts     # Stage 2: Audio extraction + sherpa-onnx ASR
│   │   ├── analyse.ts        # Stage 3: ebur128 loudness + scene cut detection
│   │   ├── detect.ts         # Stage 4: LLM prompt builder + OpenAI API caller
│   │   ├── assemble.ts       # Stage 5: FFmpeg cut/reframe/subtitle/loudnorm
│   │   ├── face.ts           # YuNet ONNX face bbox + crop_x calculator
│   │   ├── db.ts             # better-sqlite3 schema + all query functions
│   │   ├── settings.ts       # safeStorage encrypted settings read/write
│   │   ├── models.ts         # ASR model registry + download helper
│   │   └── bin.ts            # Platform binary path resolver (dev & packaged)
│   └── renderer/             # React 19 frontend (Vite-bundled)
│       ├── index.html
│       └── src/
│           ├── App.tsx             # Root layout, page router, IPC listener
│           ├── main.tsx            # React mount + browser mock for web preview
│           ├── index.css           # Dark theme + Tailwind CSS v4
│           ├── pages/
│           │   ├── Home.tsx        # Drop zone, URL input, job history
│           │   ├── Job.tsx         # Transcript viewer + clip review/export
│           │   └── Settings.tsx    # API key, model, folder configuration
│           ├── components/
│           │   ├── ClipCard.tsx    # Score, hook, reason, Watch + Download
│           │   ├── TranscriptViewer.tsx  # Word stream with signal highlighting
│           │   ├── ProgressBar.tsx # 5-stage animated pipeline progress bar
│           │   └── VideoPlayer.tsx # Native HTML5 video preview player
│           └── store/
│               ├── useJobStore.ts       # Zustand: jobs, clips, words, progress
│               └── useSettingsStore.ts  # Zustand: settings load/save
├── electron.vite.config.ts   # Vite multi-target config (main/preload/renderer)
├── package.json              # Dependencies + electron-builder targets
├── tsconfig.json             # TypeScript project references
├── tsconfig.node.json        # Main + preload TS config (strict)
└── tsconfig.web.json         # Renderer TS config (strict)
```

---

## ⚡ Quick Start

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS+ | Runtime |
| npm | 10+ | Package manager |
| Python | 3.11+ | For `electron-rebuild` / node-gyp |
| Git | Any | Version control |

### 1. Clone & Install

```bash
git clone https://github.com/sayanpal514-hue/Clipify.git
cd Clipify
npm install       # Also runs electron-rebuild for native modules
```

### 2. Add Binaries

Download and place in `resources/bin/`:

| Binary | Windows | macOS/Linux |
|---|---|---|
| [FFmpeg](https://ffmpeg.org/download.html) | `ffmpeg.exe` | `ffmpeg` |
| [FFprobe](https://ffmpeg.org/download.html) | `ffprobe.exe` | `ffprobe` |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases/latest) | `yt-dlp.exe` | `yt-dlp` |

```bash
# macOS/Linux — make executable
chmod +x resources/bin/ffmpeg resources/bin/ffprobe resources/bin/yt-dlp
```

### 3. Download an ASR Model

In Clipify → **Settings → Speech Recognition → Set Up**, or manually:

```
# SenseVoice Small (170 MB, recommended)
mkdir -p userData/models/sensevoice
# Download: https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models
# File: sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17.tar.bz2
# Extract so model.onnx + tokens.txt are directly inside models/sensevoice/
```

**userData location:**
- Windows: `%APPDATA%\clipify\models\`
- macOS: `~/Library/Application Support/clipify/models/`
- Linux: `~/.config/clipify/models/`

### 4. Configure LLM API Key

Open **Settings → AI / LLM** and enter your key. Compatible with:

| Provider | Base URL |
|---|---|
| OpenAI | `https://api.openai.com/v1` *(default)* |
| Groq | `https://api.groq.com/openai/v1` |
| Together AI | `https://api.together.xyz/v1` |
| LM Studio | `http://localhost:1234/v1` |
| Ollama | `http://localhost:11434/v1` |

### 5. Run

```bash
# Development (hot reload)
npm run dev

# Or web preview only (no Electron required)
npx vite src/renderer --port 5173
# → http://127.0.0.1:5173
```

---

## 📦 Build & Package

```bash
# Windows — NSIS installer
npm run package:win

# macOS — DMG + ZIP (arm64 + x64 universal)
npm run package:mac

# Linux — AppImage
npm run package:linux
```

Built outputs land in `dist/`.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | Electron 31 (`contextIsolation: true`, `nodeIntegration: false`) |
| Build Tool | electron-vite |
| UI | React 19 + TypeScript (strict) |
| Styling | Tailwind CSS 4 + CSS custom properties |
| State | Zustand |
| Database | better-sqlite3 (WAL mode, word-level storage) |
| ASR | sherpa-onnx Node.js bindings |
| Face Detection | onnxruntime-node + YuNet ONNX |
| Video Processing | FFmpeg static binary (8.x) + fluent-ffmpeg types |
| YouTube Download | yt-dlp |
| LLM | openai npm package (OpenAI-compatible) |
| Packaging | electron-builder |

---

## 🗄️ Database Schema

```sql
-- Jobs: one row per imported video
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  source_path TEXT,         -- local path or YouTube URL
  status TEXT,              -- pending|ingesting|transcribing|analysing|detecting|assembling|done|error
  created_at INTEGER,       -- Unix ms timestamp
  error_message TEXT,       -- set on failure
  metadata TEXT             -- JSON: duration, width, height, fps, codec, actual_path
);

-- Words: every word from the ASR transcript
CREATE TABLE words (
  job_id TEXT, idx INTEGER,
  word TEXT, start REAL, end REAL,
  is_loud INTEGER DEFAULT 0,          -- 1 if near a loudness spike
  after_scene_cut INTEGER DEFAULT 0,  -- 1 if within 2s of a scene cut
  PRIMARY KEY (job_id, idx)
);

-- Clips: LLM-detected highlight moments
CREATE TABLE clips (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  start_word_idx INTEGER, end_word_idx INTEGER,
  start_time REAL, end_time REAL,
  score INTEGER,          -- 0–100 virality score
  hook TEXT,              -- scroll-stopping opening line
  reason TEXT,            -- LLM explanation
  output_path TEXT,       -- final MP4 path after assembly
  status TEXT             -- pending|approved|rejected|exported
);
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| `FFmpeg not found` | Ensure `resources/bin/ffmpeg(.exe)` exists and is executable |
| `ASR model not found` | Extract model archive into `userData/models/<model-name>/` |
| `No API key` | Add key in Settings → AI / LLM |
| LLM returns invalid JSON | Clipify auto-retries once; try `gpt-4o` or a larger model |
| `electron-rebuild` fails | Install Python 3.11+ and run `npm install -g node-gyp` |
| Native module ABI mismatch | Delete `node_modules/` and re-run `npm install` |
| yt-dlp blocked by policy | Use `python -m yt_dlp` or place `yt-dlp.exe` in `resources/bin/` |

---

## 🤝 Contributing

Pull requests welcome! Please open an issue first to discuss major changes.

```bash
git checkout -b feature/my-feature
git commit -m "feat: add my feature"
git push origin feature/my-feature
```

---

## 📄 License

MIT © 2024 [LICENSE](./LICENSE)

---

<div align="center">
Built by Sayan
</div>
