from __future__ import annotations

import tempfile

from fastapi import APIRouter, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from starlette.concurrency import run_in_threadpool

from audio_transcription.api.deps import resolve_whisper_model
from audio_transcription.api.schemas import TranscriptionResponse, YouTubeTranscribeRequest
from audio_transcription.services.youtube import transcribe_youtube_video

router = APIRouter(prefix="/transcribe", tags=["transcribe"])


@router.post("/youtube", response_model=TranscriptionResponse)
async def transcribe_youtube(request: Request, body: YouTubeTranscribeRequest) -> TranscriptionResponse:
    model = resolve_whisper_model(request, body.model)

    def job() -> TranscriptionResponse:
        with tempfile.TemporaryDirectory(prefix="at_yt_") as td:
            raw = transcribe_youtube_video(
                body.url,
                model_size=model,
                language=body.language,
                work_dir=td,
                temp_basename="stream",
                save_transcript=False,
            )
            return TranscriptionResponse(**jsonable_encoder(dict(raw)))

    try:
        return await run_in_threadpool(job)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
