from __future__ import annotations

from pathlib import Path

from audio_transcription.services.transcription import TranscriptionService


def format_srt_timestamp(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millisecs = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millisecs:03d}"


def segments_to_srt(segments: list[dict]) -> str:
    lines: list[str] = []
    for i, segment in enumerate(segments, 1):
        start = format_srt_timestamp(segment["start"])
        end = format_srt_timestamp(segment["end"])
        text = str(segment.get("text", "")).strip()
        lines.extend([str(i), f"{start} --> {end}", text, ""])
    return "\n".join(lines)


class SubtitleService:
    """Build SRT subtitles from audio using Whisper segments."""

    def __init__(self, model_size: str = "base") -> None:
        self._transcription = TranscriptionService(model_size=model_size)

    def write_srt(
        self,
        audio_path: str | Path,
        output_path: str | Path | None = None,
        *,
        language: str | None = None,
    ) -> Path:
        path = Path(audio_path).expanduser()
        result = self._transcription.transcribe(path, language=language)
        segments = result.get("segments") or []
        out = Path(output_path) if output_path else path.with_suffix(".srt")
        out.write_text(segments_to_srt(segments), encoding="utf-8")
        print(f"✓ SRT subtitles saved to: {out}")
        return out


def create_srt_subtitles(audio_path: str, output_path: str | None = None) -> Path:
    """Create an SRT file next to the audio file (or at ``output_path``)."""
    return SubtitleService(model_size="base").write_srt(audio_path, output_path)
