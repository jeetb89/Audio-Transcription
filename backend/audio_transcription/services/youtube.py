from __future__ import annotations

from pathlib import Path

import yt_dlp

from audio_transcription.services.transcription import (
    TranscriptionResult,
    TranscriptionService,
    transcribe_audio_file,
)

# YouTube often returns 403 for the default client; try several extractor profiles (see yt-dlp issues #15212, #15712).
_YT_EXTRACTOR_FALLBACKS: tuple[dict, ...] = (
    {"youtube": {"player_client": ["web", "android"]}},
    {"youtube": {"player_client": ["tv_embedded"]}},
    {"youtube": {"player_client": ["web_embedded"]}},
    {"youtube": {"player_client": ["ios"]}},
    {},  # last resort: yt-dlp defaults for whatever version is installed
)


class YouTubeService:
    """Download audio from YouTube via yt-dlp."""

    def __init__(self, work_dir: str | Path = ".") -> None:
        self.work_dir = Path(work_dir).expanduser().resolve()

    def download_audio_mp3(self, url: str, basename: str = "temp_audio") -> Path:
        """Download best audio and extract to ``{basename}.mp3`` under ``work_dir``."""
        self.work_dir.mkdir(parents=True, exist_ok=True)
        out_tmpl = str(self.work_dir / f"{basename}.%(ext)s")
        postprocessors = [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ]

        last_error: Exception | None = None
        for extra_extractors in _YT_EXTRACTOR_FALLBACKS:
            ydl_opts: dict = {
                "format": "bestaudio/best",
                "outtmpl": out_tmpl,
                "postprocessors": postprocessors,
                "quiet": True,
                "no_warnings": True,
                "retries": 2,
                "fragment_retries": 3,
                "ignoreerrors": False,
            }
            if extra_extractors:
                ydl_opts["extractor_args"] = extra_extractors

            # Remove stale partial file from a failed attempt
            mp3_path = self.work_dir / f"{basename}.mp3"
            if mp3_path.exists():
                mp3_path.unlink(missing_ok=True)

            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([url])
            except Exception as e:
                last_error = e
                continue

            if mp3_path.is_file():
                print(f"\n🎧 Downloaded audio: {mp3_path}")
                return mp3_path

        hint = (
            "YouTube blocked the download (common causes: outdated yt-dlp, missing FFmpeg, or IP/rate limits). "
            "Try: pip install -U yt-dlp  and ensure ffmpeg is on PATH."
        )
        if last_error is not None:
            raise RuntimeError(f"{last_error!s} — {hint}") from last_error
        raise FileNotFoundError(f"Expected MP3 at {mp3_path} after download. {hint}")


def transcribe_youtube_video(
    url: str,
    model_size: str = "base",
    language: str | None = None,
    *,
    work_dir: str | Path = ".",
    temp_basename: str = "temp_audio",
    save_transcript: bool = True,
) -> TranscriptionResult:
    """Download YouTube audio to MP3, then transcribe with Whisper.

    When ``save_transcript`` is True (default), writes ``{temp_basename}_transcript.txt``
    in the current working directory (legacy script behavior via ``transcribe_audio_file``).
    When False, only returns structured results (e.g. for APIs).
    """
    yt = YouTubeService(work_dir=work_dir)
    audio_file = yt.download_audio_mp3(url, basename=temp_basename)
    if save_transcript:
        result = transcribe_audio_file(
            audio_file,
            model_size=model_size,
            language=language,
        )
    else:
        service = TranscriptionService(model_size=model_size)
        result = service.transcribe(audio_file, language=language)
    print("\n✅ --- Transcription Complete ---\n")
    return result
