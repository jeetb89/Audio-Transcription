from __future__ import annotations

import os
from pathlib import Path

import yt_dlp

from audio_transcription.services.transcription import (
    TranscriptionResult,
    TranscriptionService,
    transcribe_audio_file,
)

# YouTube often returns 403 / "Sign in to confirm you're not a bot"; try several clients (see yt-dlp wiki & issues).
_YT_EXTRACTOR_FALLBACKS: tuple[dict, ...] = (
    {"youtube": {"player_client": ["android", "web"]}},
    {"youtube": {"player_client": ["web", "android"]}},
    {"youtube": {"player_client": ["android_creator"]}},
    {"youtube": {"player_client": ["mweb"]}},
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

        cookie_path = os.getenv("YOUTUBE_COOKIES_FILE", "").strip()
        if cookie_path:
            p = Path(cookie_path).expanduser()
            if not p.is_file():
                raise RuntimeError(
                    f"YOUTUBE_COOKIES_FILE is set but not a readable file: {p}. "
                    "Export Netscape cookies from a browser where you're signed into YouTube."
                )

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
            if cookie_path:
                ydl_opts["cookiefile"] = str(Path(cookie_path).expanduser().resolve())

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
                max_dl_mb = int(os.getenv("YOUTUBE_MAX_DOWNLOAD_MB", os.getenv("API_UPLOAD_MAX_MB", "5")))
                if max_dl_mb < 1:
                    max_dl_mb = 5
                sz = mp3_path.stat().st_size
                limit = max_dl_mb * 1024 * 1024
                if sz > limit:
                    mp3_path.unlink(missing_ok=True)
                    raise RuntimeError(
                        f"Extracted audio is {sz / (1024 * 1024):.1f} MB; max allowed is {max_dl_mb} MB "
                        "(YOUTUBE_MAX_DOWNLOAD_MB / API_UPLOAD_MAX_MB). Use a shorter video or raise limits on a larger server."
                    )
                print(f"\n🎧 Downloaded audio: {mp3_path}")
                return mp3_path

        err_text = str(last_error) if last_error else ""
        if "Sign in" in err_text or "not a bot" in err_text.lower():
            hint = (
                "YouTube is treating this host as a bot (very common on cloud IPs like Render). "
                "Fixes: (1) set env YOUTUBE_COOKIES_FILE to a Netscape cookies.txt from a logged-in browser "
                "(see https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies ); "
                "(2) run yt-dlp/this flow on your own machine instead of the server; "
                "(3) pip install -U yt-dlp and ensure ffmpeg is installed."
            )
        else:
            hint = (
                "YouTube blocked the download (outdated yt-dlp, missing FFmpeg, IP/rate limits, or geo). "
                "Try: pip install -U yt-dlp, ensure ffmpeg is on PATH, or set YOUTUBE_COOKIES_FILE."
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
