from __future__ import annotations

from pathlib import Path

from audio_transcription.services.transcription import TranscriptionResult, TranscriptionService


class BatchTranscriptionService:
    """Run Whisper over many files with a single loaded model."""

    def __init__(self, model_size: str = "base") -> None:
        self._service = TranscriptionService(model_size=model_size)

    def transcribe_paths(
        self,
        audio_files: list[str | Path],
        output_dir: str | Path = "transcripts",
        *,
        persist: bool = True,
    ) -> list[TranscriptionResult]:
        out_dir = Path(output_dir)
        if persist:
            out_dir.mkdir(parents=True, exist_ok=True)
        results: list[TranscriptionResult] = []

        for i, audio_file in enumerate(audio_files, 1):
            print(f"\n--- Processing file {i}/{len(audio_files)} ---")
            try:
                result = self._service.transcribe(audio_file)
                if persist:
                    stem = Path(audio_file).stem
                    target = out_dir / f"{stem}_transcript.txt"
                    self._service.save_transcription(result, target)
                results.append(result)
            except Exception as e:
                print(f"✗ Failed to process {audio_file}: {e}")
                continue

        print(f"\n✓ Batch processing completed: {len(results)}/{len(audio_files)} files successful")
        return results


def batch_transcribe(
    audio_files: list[str],
    output_dir: str = "transcripts",
    model_size: str = "base",
    *,
    persist: bool = True,
) -> list[TranscriptionResult]:
    return BatchTranscriptionService(model_size=model_size).transcribe_paths(
        audio_files,
        output_dir=output_dir,
        persist=persist,
    )
