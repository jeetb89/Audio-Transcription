export type TranscriptionResponse = {
  text: string;
  language: string;
  processing_time: number;
  segments: Record<string, unknown>[];
};

export type HealthResponse = { status: string };

export type UserRead = {
  id: string;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type JobRead = {
  id: string;
  user_id: string | null;
  status: string;
  source_type: string;
  filename: string | null;
  source_url: string | null;
  provider: string | null;
  whisper_model: string | null;
  language: string | null;
  error_message: string | null;
  result_text: string | null;
  result_segments: Record<string, unknown>[] | null;
  processing_time_seconds: number | null;
  parent_job_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type JobListResponse = {
  items: JobRead[];
  total: number;
  limit: number;
  offset: number;
};

export type JobDashboardSummary = {
  total: number;
  by_status: Record<string, number>;
};

export type SubtitleResponse = {
  srt: string;
  language: string;
  processing_time: number;
};

export type BatchTranscriptionResponse = {
  items: {
    filename: string;
    ok: boolean;
    error: string | null;
    result: TranscriptionResponse | null;
  }[];
};
