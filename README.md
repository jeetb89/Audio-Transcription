# Audio Transcription

Full-stack app for **transcribing audio and video** with **OpenAI Whisper** (local inference), plus **YouTube** downloads via **yt-dlp**, **SRT subtitles**, **batch uploads**, and a **job dashboard** (PostgreSQL) with live updates (WebSocket, SSE fallback).

## What’s in the box

| Layer | Tech |
|--------|------|
| **API** | FastAPI, Uvicorn, SQLAlchemy 2, Alembic, psycopg v3 |
| **ML / media** | `openai-whisper`, PyTorch, FFmpeg, `yt-dlp` |
| **Database** | PostgreSQL (e.g. Supabase); schema via **Alembic** and/or **Supabase CLI** migrations in `supabase/migrations/` |
| **UI** | React 18, TypeScript, Vite, TanStack Query, React Router, Material UI |

## Repository layout

```
AudioTranscription/
├── backend/           # Python package audio_transcription (API, services, Alembic)
├── frontend/          # Vite React SPA
├── supabase/          # Supabase config + SQL migrations (optional; use one migration path per DB)
├── Dockerfile         # API image (API only; root = repo root for Render)
└── render.yaml        # Optional Render blueprint
```

## Features (high level)

- **Transcribe** — upload a file → Whisper on the server  
- **YouTube** — URL → download audio → transcribe (subject to YouTube / IP / cookies limits on cloud hosts)  
- **Subtitles** — upload → SRT from Whisper segments  
- **Batch** — multiple files in one request (server enforces max file count)  
- **Jobs** — create/list/detail jobs, search, status filters, live progress hooks  
- **AssemblyAI** routes exist in code but are **disabled** in `main.py` by default  

## Local development

1. **Python 3.10+**, virtualenv, **FFmpeg** on `PATH`, **PostgreSQL** (optional for job APIs).

2. **Backend** (from repo root, venv activated):

   ```bash
   pip install -e ./backend
   export DATABASE_URL="postgresql+psycopg://USER:PASS@localhost:5432/your_db"
   cd backend && at-db upgrade head && cd ..
   uvicorn audio_transcription.api.main:app --reload --host 0.0.0.0 --port 8000
   ```

   Open [http://localhost:8000/docs](http://localhost:8000/docs).

3. **Frontend**:

   ```bash
   cd frontend && npm install && npm run dev
   ```

   [http://localhost:5173](http://localhost:5173) — Vite proxies `/api` to port **8000**.

More detail: [`backend/README.md`](backend/README.md), [`frontend/README.md`](frontend/README.md).

## Environment variables (API)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL URL (`postgresql://…` is normalized to `postgresql+psycopg://`) |
| `CORS_ORIGINS` | `*` or comma-separated UI origins (required for cross-origin browsers) |
| `API_UPLOAD_MAX_MB` | Max upload size (default **5** in code; raise locally if needed) |
| `WHISPER_MODEL` | Default Whisper size: `tiny` … `large` |
| `WHISPER_LOW_MEMORY` | If `1` / `true`, API always uses **`tiny`** (small RAM hosts) |
| `BATCH_MAX_FILES` | Max files per batch request (default **2**) |
| `YOUTUBE_MAX_DOWNLOAD_MB` | Max extracted audio size for YouTube flow |
| `YOUTUBE_COOKIES_FILE` | Optional path to Netscape cookies (helps when YouTube blocks datacenter IPs) |
| `PORT` | Listen port (e.g. Render sets this) |

Never commit secrets (`.env`, database passwords, cookies).

## Deployment notes

- **API (Docker):** build from **repository root**; `Dockerfile` copies `backend/` and pre-downloads Whisper **tiny** to reduce first-request memory spikes. **512MB** instances are still tight for Whisper + PyTorch; upgrade RAM if you see OOM.  
- **Frontend (e.g. Vercel):** set **Root Directory** to `frontend`, build `npm run build`, output `dist/`, env **`VITE_API_BASE`** = public API origin (no trailing slash).  
- **Health checks:** use **`GET` or `HEAD`** on **`/api/v1/health`**; **`HEAD /`** is supported for simple probes.

## License / stack versions

See `backend/pyproject.toml` and `frontend/package.json` for pinned dependencies.
