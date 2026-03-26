from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.encoders import jsonable_encoder
from starlette.concurrency import run_in_threadpool

from audio_transcription.api.deps import get_settings, get_whisper_service
from audio_transcription.api.schemas import TranscriptionResponse

router = APIRouter(prefix="/transcribe", tags=["transcribe"])

_ALLOWED_AUDIO_SUFFIXES = {".mp3", ".wav", ".m4a", ".flac", ".aac", ".ogg", ".webm", ".mp4", ".mpeg", ".mpga"}


def _suffix(name: str) -> str:
    return Path(name).suffix.lower()


@router.post("/file", response_model=TranscriptionResponse)
async def transcribe_uploaded_file(
    request: Request,
    file: UploadFile = File(...),
    model: str | None = Form(None),
    language: str | None = Form(None),
) -> TranscriptionResponse:
    settings = get_settings(request)
    max_bytes = settings.upload_max_mb * 1024 * 1024
    body = await file.read()
    if len(body) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large (max {settings.upload_max_mb} MB)",
        )

    suffix = _suffix(file.filename or "audio")
    if suffix and suffix not in _ALLOWED_AUDIO_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported extension '{suffix}'. Allowed: {sorted(_ALLOWED_AUDIO_SUFFIXES)}",
        )
    if not suffix:
        suffix = ".bin"

    def run(path: str) -> TranscriptionResponse:
        svc = get_whisper_service(request, model)
        raw = svc.transcribe(path, language=language)
        payload = jsonable_encoder(dict(raw))
        return TranscriptionResponse(**payload)

    tmp_path: str | None = None
    try:
        fd, tmp_path = tempfile.mkstemp(suffix=suffix, prefix="at_upload_")
        os.close(fd)
        Path(tmp_path).write_bytes(body)
        return await run_in_threadpool(run, tmp_path)
    finally:
        if tmp_path and Path(tmp_path).is_file():
            Path(tmp_path).unlink(missing_ok=True)
