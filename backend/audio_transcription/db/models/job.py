from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from audio_transcription.db.base import Base

if TYPE_CHECKING:
    from audio_transcription.db.models.user import User


class Job(Base):
    """A single transcription (or sub-) job, suitable for queue and API status polling."""

    __tablename__ = "transcription_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # queued | processing | completed | failed | cancelled
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True, server_default="queued")

    # file_upload | youtube | assembly_url | assembly_file | subtitles | batch
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)

    filename: Mapped[str | None] = mapped_column(String(512), nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    provider: Mapped[str | None] = mapped_column(String(64), nullable=True)
    whisper_model: Mapped[str | None] = mapped_column(String(32), nullable=True)
    language: Mapped[str | None] = mapped_column(String(16), nullable=True)

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_segments: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    processing_time_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)

    parent_job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transcription_jobs.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User | None"] = relationship("User", back_populates="jobs")
    parent: Mapped["Job | None"] = relationship(
        "Job",
        remote_side=[id],
        back_populates="children",
    )
    children: Mapped[list["Job"]] = relationship(
        "Job",
        back_populates="parent",
        cascade="all, delete-orphan",
    )
