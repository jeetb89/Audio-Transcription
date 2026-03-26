# API image for Render, Fly.io, Railway, etc.
# Note: Whisper + PyTorch are large; free tiers may OOM or cold-start slowly.

FROM python:3.11-slim-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg git build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend ./backend
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -e ./backend

ENV PORT=8000
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
ENV OPENBLAS_NUM_THREADS=1
ENV NUMEXPR_NUM_THREADS=1
EXPOSE 8000

# DATABASE_URL, CORS_ORIGINS, WHISPER_MODEL, ASSEMBLY_AI_API_KEY — set in host dashboard
CMD uvicorn audio_transcription.api.main:app --host 0.0.0.0 --port ${PORT}
