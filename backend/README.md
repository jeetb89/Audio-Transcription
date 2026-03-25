# Audio transcription backend (services)

Install in editable mode from the project root (use your virtualenv, e.g. `whisper-env`):

```bash
pip install -e ./backend
```

Or add `backend` to `PYTHONPATH` when running scripts without installing:

```bash
export PYTHONPATH="/path/to/AudioTranscription/backend:$PYTHONPATH"
```

Package: `audio_transcription.services` — transcription, YouTube download, subtitles, batch, AssemblyAI.

**React UI:** see `../frontend/README.md` — `npm run dev` with Vite proxy to this API on port 8000.

## HTTP API (FastAPI)

Run the server:

```bash
uvicorn audio_transcription.api.main:app --reload --host 0.0.0.0 --port 8000
```

Or after install: `at-api` (reload on `PORT` default 8000).

- OpenAPI UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- Base path: `/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Liveness |
| POST | `/api/v1/users` | Create user (`email` optional, unique) |
| GET | `/api/v1/users/{user_id}` | Fetch user |
| POST | `/api/v1/jobs` | Create transcription job row (`source_type`, optional `filename`, `source_url`, `whisper_model`, `language`, `user_id`, `parent_job_id`) |
| GET | `/api/v1/jobs` | List jobs (`limit`, `offset`, optional `status`, `user_id`) |
| GET | `/api/v1/jobs/{job_id}` | Job detail |
| PATCH | `/api/v1/jobs/{job_id}` | Update job (e.g. status, results for workers); terminal jobs cannot change status |
| POST | `/api/v1/transcribe/file` | Multipart audio + optional `model`, `language` |
| POST | `/api/v1/transcribe/youtube` | JSON `{ "url", "model?", "language?" }` |
| POST | `/api/v1/transcribe/batch` | Multipart multiple `files` + optional `model`, `language` |
| POST | `/api/v1/subtitles/file` | Multipart audio → SRT string in JSON |
| POST | `/api/v1/transcribe/assembly/url` | JSON `{ "url" }` (public audio URL) |
| POST | `/api/v1/transcribe/assembly/file` | Multipart audio |

Environment: `WHISPER_MODEL` (default whisper size), `API_UPLOAD_MAX_MB`, `CORS_ORIGINS` (`*` or comma-separated), `ASSEMBLY_AI_API_KEY`, `PORT` (for `at-api`), **`DATABASE_URL`** (required for `/users` and `/jobs`; run `at-db upgrade head` first).

Whisper work runs in a thread pool so the event loop stays responsive; long jobs should later move to a queue.

## Database (PostgreSQL + SQLAlchemy + Alembic)

ORM lives in `audio_transcription.db`: **`User`**, **`Job`** (`transcription_jobs` table), enums in **`audio_transcription.db.constants`** (`JobStatus`, `JobSourceType`).

Set a SQLAlchemy URL (SQLAlchemy 2 + **psycopg v3**):

```bash
export DATABASE_URL="postgresql+psycopg://USER:PASSWORD@localhost:5432/audio_transcription"
```

Create the database once in Postgres (`createdb audio_transcription` or your host’s UI), then apply migrations from the **`backend`** directory:

```bash
cd backend
at-db upgrade head
# or: python -m audio_transcription.db upgrade head
```

Other useful commands: `at-db current`, `at-db history`, `at-db downgrade -1`.

New revision after model changes (with `DATABASE_URL` set so metadata can be compared when using autogenerate):

```bash
at-db revision --autogenerate -m "describe change"
```

The initial migration is **`0001_initial`** (`alembic/versions/0001_initial_schema.py`).

When `DATABASE_URL` is unset, the API still starts; `Depends(get_db)` returns **503** until you configure the URL. With it set, the app builds an engine and **`session_factory`** on startup (`api/main.py` lifespan).

### `Job` fields (summary)

| Column | Purpose |
|--------|---------|
| `status` | `queued` / `processing` / `completed` / `failed` / `cancelled` |
| `source_type` | `file_upload`, `youtube`, `assembly_url`, `assembly_file`, `subtitles`, `batch` |
| `filename`, `source_url` | Input hint for uploads vs URLs |
| `provider`, `whisper_model`, `language` | Engine metadata |
| `result_text`, `result_segments` (JSONB) | Whisper-style output |
| `processing_time_seconds`, `error_message`, `completed_at` | Lifecycle |
| `parent_job_id` | Optional batch parent |
| `user_id` | Optional FK to `users` (auth later) |
