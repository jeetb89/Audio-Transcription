from __future__ import annotations

from collections.abc import Generator

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from audio_transcription.api.config import ApiSettings
from audio_transcription.db.session import committing_session
from audio_transcription.services.transcription import TranscriptionService

_WHISPER_MODELS = frozenset({"tiny", "base", "small", "medium", "large"})


def get_settings(request: Request) -> ApiSettings:
    return request.app.state.settings


def resolve_whisper_model(request: Request, model: str | None) -> str:
    settings: ApiSettings = request.app.state.settings
    name = (model or settings.whisper_default_model).strip().lower()
    if name not in _WHISPER_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid Whisper model '{name}'. Allowed: {sorted(_WHISPER_MODELS)}",
        )
    return name


def get_whisper_service(request: Request, model: str | None) -> TranscriptionService:
    name = resolve_whisper_model(request, model)
    cache: dict[str, TranscriptionService] = request.app.state.whisper_services
    if name not in cache:
        cache[name] = TranscriptionService(model_size=name)
    return cache[name]


def get_db(request: Request) -> Generator[Session, None, None]:
    factory = getattr(request.app.state, "session_factory", None)
    if factory is None:
        raise HTTPException(
            status_code=503,
            detail="Database is not configured. Set DATABASE_URL.",
        )
    yield from committing_session(factory)
