from __future__ import annotations

import os
from pathlib import Path

import assemblyai as aai
from dotenv import load_dotenv


class AssemblyTranscriptionService:
    """Cloud transcription via AssemblyAI."""

    def __init__(self, api_key: str | None = None) -> None:
        load_dotenv()
        key = api_key or os.getenv("ASSEMBLY_AI_API_KEY")
        if key:
            aai.settings.api_key = key

    def transcribe(
        self,
        audio_file: str | Path,
        *,
        speech_model: aai.SpeechModel = aai.SpeechModel.universal,
    ) -> str:
        if not getattr(aai.settings, "api_key", None):
            raise ValueError("ASSEMBLY_AI_API_KEY is not set (env or constructor).")
        path_or_url = str(audio_file)
        config = aai.TranscriptionConfig(speech_model=speech_model)
        transcript = aai.Transcriber(config=config).transcribe(path_or_url)
        if transcript.status == "error":
            raise RuntimeError(f"Transcription failed: {transcript.error}")
        return transcript.text


def transcribe_audio_assembly(
    audio_file: str | Path,
    speech_model: aai.SpeechModel = aai.SpeechModel.universal,
) -> str:
    """Module-level helper matching the legacy ``transcribe_audio`` API."""
    return AssemblyTranscriptionService().transcribe(audio_file, speech_model=speech_model)
