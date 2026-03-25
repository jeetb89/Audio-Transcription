"""Shared job / source labels for API, workers, and persistence."""

from __future__ import annotations

from enum import Enum


class JobStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class JobSourceType(str, Enum):
    file_upload = "file_upload"
    youtube = "youtube"
    assembly_url = "assembly_url"
    assembly_file = "assembly_file"
    subtitles = "subtitles"
    batch = "batch"
