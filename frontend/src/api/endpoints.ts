import { apiFetch } from "./client";
import type {
  BatchTranscriptionResponse,
  HealthResponse,
  JobDashboardSummary,
  JobListResponse,
  JobRead,
  SubtitleResponse,
  TranscriptionResponse,
  UserRead,
} from "./types";

const v1 = "/api/v1";

export function getHealth() {
  return apiFetch<HealthResponse>(`${v1}/health`);
}

export function transcribeFile(file: File, model?: string, language?: string) {
  const fd = new FormData();
  fd.append("file", file);
  if (model) fd.append("model", model);
  if (language) fd.append("language", language);
  return apiFetch<TranscriptionResponse>(`${v1}/transcribe/file`, { method: "POST", body: fd });
}

export function transcribeYouTube(url: string, model?: string, language?: string) {
  return apiFetch<TranscriptionResponse>(`${v1}/transcribe/youtube`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, model: model || null, language: language || null }),
  });
}

export function transcribeBatch(files: File[], model?: string, language?: string) {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  if (model) fd.append("model", model);
  if (language) fd.append("language", language);
  return apiFetch<BatchTranscriptionResponse>(`${v1}/transcribe/batch`, { method: "POST", body: fd });
}

export function subtitlesFromFile(file: File, model?: string, language?: string) {
  const fd = new FormData();
  fd.append("file", file);
  if (model) fd.append("model", model);
  if (language) fd.append("language", language);
  return apiFetch<SubtitleResponse>(`${v1}/subtitles/file`, { method: "POST", body: fd });
}

export function createUser(email?: string | null) {
  return apiFetch<UserRead>(`${v1}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email || null }),
  });
}

export function getJobsSummary() {
  return apiFetch<JobDashboardSummary>(`${v1}/jobs/summary`);
}

export function listJobs(params: {
  limit?: number;
  offset?: number;
  status?: string;
  user_id?: string;
  q?: string;
}) {
  const q = new URLSearchParams();
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.offset != null) q.set("offset", String(params.offset));
  if (params.status) q.set("status", params.status);
  if (params.user_id) q.set("user_id", params.user_id);
  if (params.q?.trim()) q.set("q", params.q.trim());
  const qs = q.toString();
  return apiFetch<JobListResponse>(`${v1}/jobs${qs ? `?${qs}` : ""}`);
}

export function getJob(id: string) {
  return apiFetch<JobRead>(`${v1}/jobs/${id}`);
}

export function patchJob(id: string, body: Record<string, unknown>) {
  return apiFetch<JobRead>(`${v1}/jobs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function createJob(body: {
  source_type: string;
  filename?: string | null;
  source_url?: string | null;
  whisper_model?: string | null;
  language?: string | null;
  user_id?: string | null;
  parent_job_id?: string | null;
}) {
  return apiFetch<JobRead>(`${v1}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
