-- Audio transcription app: matches backend/alembic/versions/0001_initial_schema.py
-- If this DB was already migrated with Alembic, skip or baseline instead of `db push` (tables would already exist).

create table public.users (
    id uuid not null primary key,
    email varchar(320),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint users_email_key unique (email)
);

create table public.transcription_jobs (
    id uuid not null primary key,
    user_id uuid references public.users (id) on delete set null,
    status varchar(32) not null default 'queued',
    source_type varchar(32) not null,
    filename varchar(512),
    source_url text,
    provider varchar(64),
    whisper_model varchar(32),
    language varchar(16),
    error_message text,
    result_text text,
    result_segments jsonb,
    processing_time_seconds double precision,
    parent_job_id uuid references public.transcription_jobs (id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz
);

create index ix_transcription_jobs_status on public.transcription_jobs (status);
create index ix_transcription_jobs_source_type on public.transcription_jobs (source_type);
create index ix_transcription_jobs_user_id on public.transcription_jobs (user_id);
create index ix_transcription_jobs_parent_job_id on public.transcription_jobs (parent_job_id);
