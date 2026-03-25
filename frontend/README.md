# Audio Transcription — React UI

Vite + React 18 + TypeScript + TanStack Query + React Router.

## Develop

1. Start the API (from repo root, with your venv):

   `uvicorn audio_transcription.api.main:app --reload --host 0.0.0.0 --port 8000`

2. Install and run the UI:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173). Requests to `/api` are proxied to `http://127.0.0.1:8000` (see `vite.config.ts`).

## Production API URL

If the UI is hosted separately from the API, set at build time:

```bash
VITE_API_BASE=https://api.example.com npm run build
```

(`VITE_API_BASE` must not include a trailing slash; paths already use `/api/v1/...`.)

## Build

```bash
npm run build
```

Static output is in `dist/`. Serve with any static host; configure CORS on the FastAPI app for your UI origin if not same-origin.
