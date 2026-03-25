from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.encoders import jsonable_encoder
from starlette.concurrency import run_in_threadpool

from audio_transcription.api.deps import get_settings, get_whisper_service
from audio_transcription.api.schemas import BatchTranscriptionItem, BatchTranscriptionResponse, TranscriptionResponse

router = APIRouter(prefix="/transcribe", tags=["transcribe"])

_ALLOWED = {".mp3", ".wav", ".m4a", ".flac", ".aac", ".ogg", ".webm", ".mp4", ".mpeg", ".mpga"}


@router.post("/batch", response_model=BatchTranscriptionResponse)
async def transcribe_batch(
    request: Request,
    files: list[UploadFile] = File(...),
    model: str | None = Form(None),
    language: str | None = Form(None),
) -> BatchTranscriptionResponse:
    if not files:
        raise HTTPException(status_code=400, detail="At least one file is required")

    settings = get_settings(request)
    max_bytes = settings.upload_max_mb * 1024 * 1024
    service = get_whisper_service(request, model)

    staged: list[tuple[str, str]] = []

    try:
        for f in files:
            body = await f.read()
            if len(body) > max_bytes:
                raise HTTPException(
                    status_code=413,
                    detail=f"File '{f.filename}' exceeds max {settings.upload_max_mb} MB",
                )
            suffix = Path(f.filename or "audio").suffix.lower()
            if suffix and suffix not in _ALLOWED:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported extension '{suffix}' on '{f.filename}'",
                )
            if not suffix:
                suffix = ".bin"
            fd, tmp_path = tempfile.mkstemp(suffix=suffix, prefix="at_batch_")
            os.close(fd)
            Path(tmp_path).write_bytes(body)
            staged.append((f.filename or Path(tmp_path).name, tmp_path))

        def run() -> list[BatchTranscriptionItem]:
            items: list[BatchTranscriptionItem] = []
            for filename, path in staged:
                try:
                    raw = service.transcribe(path, language=language)
                    enc = jsonable_encoder(dict(raw))
                    items.append(
                        BatchTranscriptionItem(
                            filename=filename,
                            ok=True,
                            error=None,
                            result=TranscriptionResponse(**enc),
                        )
                    )
                except Exception as e:
                    items.append(
                        BatchTranscriptionItem(
                            filename=filename,
                            ok=False,
                            error=str(e),
                            result=None,
                        )
                    )
            return items

        items = await run_in_threadpool(run)
        return BatchTranscriptionResponse(items=items)
    finally:
        for _, path in staged:
            p = Path(path)
            if p.is_file():
                p.unlink(missing_ok=True)
