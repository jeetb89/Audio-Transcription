from __future__ import annotations

import os
from dataclasses import dataclass

from audio_transcription.db.database_url import normalize_database_url

_WHISPER = frozenset({"tiny", "base", "small", "medium", "large"})


@dataclass(frozen=True)
class ApiSettings:
    whisper_default_model: str
    upload_max_mb: int
    cors_origins: list[str]
    database_url: str | None


def load_settings() -> ApiSettings:
    raw_origins = os.getenv("CORS_ORIGINS", "*").strip()
    if raw_origins == "*":
        cors: list[str] = ["*"]
    else:
        cors = [o.strip() for o in raw_origins.split(",") if o.strip()]

    wm = os.getenv("WHISPER_MODEL", "base").strip().lower()
    if wm not in _WHISPER:
        wm = "base"

    db_raw = os.getenv("DATABASE_URL", "").strip()
    db = normalize_database_url(db_raw) if db_raw else ""
    return ApiSettings(
        whisper_default_model=wm,
        upload_max_mb=int(os.getenv("API_UPLOAD_MAX_MB", "500")),
        cors_origins=cors,
        database_url=db or None,
    )
