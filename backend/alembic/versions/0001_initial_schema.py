"""initial schema: users and transcription_jobs

Revision ID: 0001_initial
Revises:
Create Date: 2025-03-25

"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "transcription_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default="queued",
            nullable=False,
        ),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("filename", sa.String(length=512), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("provider", sa.String(length=64), nullable=True),
        sa.Column("whisper_model", sa.String(length=32), nullable=True),
        sa.Column("language", sa.String(length=16), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("result_text", sa.Text(), nullable=True),
        sa.Column("result_segments", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("processing_time_seconds", sa.Float(), nullable=True),
        sa.Column("parent_job_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["parent_job_id"], ["transcription_jobs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_transcription_jobs_status", "transcription_jobs", ["status"], unique=False)
    op.create_index("ix_transcription_jobs_source_type", "transcription_jobs", ["source_type"], unique=False)
    op.create_index("ix_transcription_jobs_user_id", "transcription_jobs", ["user_id"], unique=False)
    op.create_index(
        "ix_transcription_jobs_parent_job_id",
        "transcription_jobs",
        ["parent_job_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_transcription_jobs_parent_job_id", table_name="transcription_jobs")
    op.drop_index("ix_transcription_jobs_user_id", table_name="transcription_jobs")
    op.drop_index("ix_transcription_jobs_source_type", table_name="transcription_jobs")
    op.drop_index("ix_transcription_jobs_status", table_name="transcription_jobs")
    op.drop_table("transcription_jobs")
    op.drop_table("users")
