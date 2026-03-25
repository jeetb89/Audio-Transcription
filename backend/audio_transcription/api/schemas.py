from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TranscriptionResponse(BaseModel):
    text: str
    language: str
    processing_time: float
    segments: list[dict[str, Any]] = Field(default_factory=list)


class YouTubeTranscribeRequest(BaseModel):
    url: str = Field(..., description="YouTube video URL")
    model: str | None = Field(None, description="Whisper model: tiny, base, small, medium, large")
    language: str | None = Field(None, description="Optional language code (e.g. en)")


class AssemblyUrlRequest(BaseModel):
    url: str = Field(..., description="Publicly reachable audio URL")


class BatchTranscriptionItem(BaseModel):
    filename: str
    ok: bool
    error: str | None = None
    result: TranscriptionResponse | None = None


class BatchTranscriptionResponse(BaseModel):
    items: list[BatchTranscriptionItem]


class SubtitleResponse(BaseModel):
    srt: str
    language: str
    processing_time: float


# --- Users & jobs (database-backed) ---


class UserCreate(BaseModel):
    email: str | None = Field(None, max_length=320, description="Optional unique email")


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None
    created_at: datetime
    updated_at: datetime


class JobCreate(BaseModel):
    source_type: str = Field(..., description="e.g. file_upload, youtube, assembly_url, batch")
    filename: str | None = Field(None, max_length=512)
    source_url: str | None = None
    provider: str | None = Field(None, max_length=64)
    whisper_model: str | None = Field(None, max_length=32)
    language: str | None = Field(None, max_length=16)
    user_id: uuid.UUID | None = None
    parent_job_id: uuid.UUID | None = None


class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None
    status: str
    source_type: str
    filename: str | None
    source_url: str | None
    provider: str | None
    whisper_model: str | None
    language: str | None
    error_message: str | None
    result_text: str | None
    result_segments: list[dict[str, Any]] | None = None
    processing_time_seconds: float | None
    parent_job_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class JobListResponse(BaseModel):
    items: list[JobRead]
    total: int
    limit: int
    offset: int


class JobDashboardSummary(BaseModel):
    """Aggregated counts for dashboard widgets."""

    total: int
    by_status: dict[str, int]


class JobPatch(BaseModel):
    """Minimal update for workers or clients (e.g. cancel a queued job)."""

    status: str | None = Field(None, description="queued, processing, completed, failed, cancelled")
    error_message: str | None = None
    result_text: str | None = None
    result_segments: list[dict[str, Any]] | None = None
    processing_time_seconds: float | None = None
    completed_at: datetime | None = None
    provider: str | None = Field(None, max_length=64)
