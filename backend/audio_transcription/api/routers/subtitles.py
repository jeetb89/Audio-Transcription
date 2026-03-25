from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from starlette.concurrency import run_in_threadpool

from audio_transcription.api.deps import get_settings, get_whisper_service
from audio_transcription.api.schemas import SubtitleResponse
from audio_transcription.services.subtitles import segments_to_srt

router = APIRouter(prefix="/subtitles", tags=["subtitles"])

_ALLOWED = {".mp3", ".wav", ".m4a", ".flac", ".aac", ".ogg", ".webm", ".mp4", ".mpeg", ".mpga"}


@router.post("/file", response_model=SubtitleResponse)
async def subtitles_from_upload(
    request: Request,
    file: UploadFile = File(...),
    model: str | None = Form(None),
    language: str | None = Form(None),
) -> SubtitleResponse:
    settings = get_settings(request)
    max_bytes = settings.upload_max_mb * 1024 * 1024
    body = await file.read()
    if len(body) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File too large (max {settings.upload_max_mb} MB)")

    suffix = Path(file.filename or "audio").suffix.lower()
    if suffix and suffix not in _ALLOWED:
        raise HTTPException(status_code=400, detail=f"Unsupported extension '{suffix}'")
    if not suffix:
        suffix = ".bin"

    service = get_whisper_service(request, model)

    def run(path: str) -> SubtitleResponse:
        result = service.transcribe(path, language=language)
        segments = result.get("segments") or []
        srt = segments_to_srt(segments)
        return SubtitleResponse(
            srt=srt,
            language=str(result["language"]),
            processing_time=float(result["processing_time"]),
        )

    tmp_path: str | None = None
    try:
        fd, tmp_path = tempfile.mkstemp(suffix=suffix, prefix="at_sub_")
        os.close(fd)
        Path(tmp_path).write_bytes(body)
        return await run_in_threadpool(run, tmp_path)
    finally:
        if tmp_path and Path(tmp_path).is_file():
            Path(tmp_path).unlink(missing_ok=True)
