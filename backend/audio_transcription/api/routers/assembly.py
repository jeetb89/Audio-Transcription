from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from starlette.concurrency import run_in_threadpool

from audio_transcription.api.deps import get_settings
from audio_transcription.api.schemas import AssemblyUrlRequest
from audio_transcription.services.assembly import AssemblyTranscriptionService

router = APIRouter(prefix="/transcribe", tags=["transcribe"])


@router.post("/assembly/url")
async def transcribe_assembly_url(body: AssemblyUrlRequest) -> dict[str, str]:
    def job() -> str:
        return AssemblyTranscriptionService().transcribe(body.url)

    try:
        text = await run_in_threadpool(job)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {"text": text}


@router.post("/assembly/file")
async def transcribe_assembly_file(request: Request, file: UploadFile = File(...)) -> dict[str, str]:
    settings = get_settings(request)
    max_bytes = settings.upload_max_mb * 1024 * 1024
    body = await file.read()
    if len(body) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File too large (max {settings.upload_max_mb} MB)")

    suffix = Path(file.filename or "audio").suffix.lower() or ".bin"

    def run(path: str) -> str:
        return AssemblyTranscriptionService().transcribe(path)

    tmp_path: str | None = None
    try:
        fd, tmp_path = tempfile.mkstemp(suffix=suffix, prefix="at_asm_")
        os.close(fd)
        Path(tmp_path).write_bytes(body)
        try:
            text = await run_in_threadpool(run, tmp_path)
        except ValueError as e:
            raise HTTPException(status_code=503, detail=str(e)) from e
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e)) from e
        return {"text": text}
    finally:
        if tmp_path and Path(tmp_path).is_file():
            Path(tmp_path).unlink(missing_ok=True)
