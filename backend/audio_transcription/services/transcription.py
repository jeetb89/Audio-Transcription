from __future__ import annotations

import gc
import time
from pathlib import Path
from typing import Any, TypedDict

import whisper


class TranscriptionResult(TypedDict, total=False):
    text: str
    language: str
    segments: list[dict[str, Any]]
    processing_time: float


class TranscriptionService:
    """Local Whisper transcription."""

    def __init__(self, model_size: str = "base") -> None:
        print(f"Loading Whisper {model_size} model...")
        self._model_size = model_size
        self._model = whisper.load_model(model_size)
        print("Model loaded successfully!")

    @property
    def model_size(self) -> str:
        return self._model_size

    def unload(self) -> None:
        """Drop model weights so another size can load (critical on ~512MB RAM)."""
        self._model = None
        gc.collect()
        try:
            import torch

            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except Exception:
            pass

    def transcribe(
        self,
        audio_path: str | Path,
        language: str | None = None,
    ) -> TranscriptionResult:
        path = Path(audio_path).expanduser()
        if not path.is_file():
            raise FileNotFoundError(f"Audio file not found: {path}")

        print(f"Transcribing: {path.name}")
        start = time.time()
        options: dict[str, Any] = {"language": language} if language else {}
        raw = self._model.transcribe(str(path), **options)
        elapsed = time.time() - start

        print(f"✓ Completed in {elapsed:.1f} seconds")
        print(f"✓ Detected language: {raw['language']}")

        return {
            "text": raw["text"].strip(),
            "language": raw["language"],
            "segments": raw.get("segments", []),
            "processing_time": elapsed,
        }

    def save_transcription(self, result: TranscriptionResult, output_path: str | Path) -> None:
        out = Path(output_path)
        with open(out, "w", encoding="utf-8") as f:
            f.write("=== Transcription Results ===\n")
            f.write(f"Language: {result['language']}\n")
            f.write(f"Processing Time: {result['processing_time']:.1f} seconds\n")
            f.write("=" * 40 + "\n\n")
            f.write(result["text"])
        print(f"✓ Transcription saved to: {out}")


# Backward-compatible name used by older scripts
AudioTranscriber = TranscriptionService


def transcribe_audio_file(
    audio_path: str | Path,
    model_size: str = "base",
    language: str | None = None,
) -> TranscriptionResult:
    """Transcribe one file and write ``{stem}_transcript.txt`` (legacy behavior)."""
    service = TranscriptionService(model_size=model_size)
    result = service.transcribe(audio_path, language=language)
    stem = Path(audio_path).stem
    service.save_transcription(result, f"{stem}_transcript.txt")
    return result
