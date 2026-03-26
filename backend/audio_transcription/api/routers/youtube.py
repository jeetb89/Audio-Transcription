from __future__ import annotations

import tempfile

from fastapi import APIRouter, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from starlette.concurrency import run_in_threadpool

from audio_transcription.api.deps import get_whisper_service, resolve_whisper_model
from audio_transcription.api.schemas import TranscriptionResponse, YouTubeTranscribeRequest
from audio_transcription.services.youtube import YouTubeService

router = APIRouter(prefix="/transcribe", tags=["transcribe"])


@router.post("/youtube", response_model=TranscriptionResponse)
async def transcribe_youtube(request: Request, body: YouTubeTranscribeRequest) -> TranscriptionResponse:
    resolve_whisper_model(request, body.model)

    def job() -> TranscriptionResponse:
        # Download first, then load Whisper — avoids holding PyTorch + yt-dlp peak together.
        with tempfile.TemporaryDirectory(prefix="at_yt_") as td:
            yt = YouTubeService(work_dir=td)
            audio_file = yt.download_audio_mp3(body.url, basename="stream")
            service = get_whisper_service(request, body.model)
            raw = service.transcribe(audio_file, language=body.language)
            return TranscriptionResponse(**jsonable_encoder(dict(raw)))

    try:
        return await run_in_threadpool(job)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
