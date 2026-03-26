from __future__ import annotations

import os
from dataclasses import dataclass

from audio_transcription.db.database_url import normalize_database_url

_WHISPER = frozenset({"tiny", "base", "small", "medium", "large"})


@dataclass(frozen=True)
class ApiSettings:
    whisper_default_model: str
    """If True, API always uses the *tiny* model (saves RAM on 512MB hosts)."""
    whisper_low_memory: bool
    upload_max_mb: int
    cors_origins: list[str]
    database_url: str | None


def load_settings() -> ApiSettings:
    raw_origins = os.getenv("CORS_ORIGINS", "*").strip()
    if raw_origins == "*":
        cors: list[str] = ["*"]
    else:
        cors = []
        for o in raw_origins.split(","):
            o = o.strip().rstrip("/")
            if o:
                cors.append(o)

    wm = os.getenv("WHISPER_MODEL", "tiny").strip().lower()
    if wm not in _WHISPER:
        wm = "tiny"

    db_raw = os.getenv("DATABASE_URL", "").strip()
    db = normalize_database_url(db_raw) if db_raw else ""
    low = os.getenv("WHISPER_LOW_MEMORY", "").strip().lower() in ("1", "true", "yes", "on")
    return ApiSettings(
        whisper_default_model=wm,
        whisper_low_memory=low,
        upload_max_mb=int(os.getenv("API_UPLOAD_MAX_MB", "5")),
        cors_origins=cors,
        database_url=db or None,
    )
