import type { BatchTranscriptionResponse, SubtitleResponse, TranscriptionResponse } from "./types";
import { postFormDataWithProgress } from "./xhrUpload";

const v1 = "/api/v1";

export function transcribeFileWithProgress(
  file: File,
  onProgress: (pct: number) => void,
  model?: string,
  language?: string,
  onUploadComplete?: () => void,
) {
  const fd = new FormData();
  fd.append("file", file);
  if (model) fd.append("model", model);
  if (language) fd.append("language", language);
  return postFormDataWithProgress<TranscriptionResponse>(`${v1}/transcribe/file`, fd, onProgress, onUploadComplete);
}

export function transcribeBatchWithProgress(
  files: File[],
  onProgress: (pct: number) => void,
  model?: string,
  language?: string,
  onUploadComplete?: () => void,
) {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  if (model) fd.append("model", model);
  if (language) fd.append("language", language);
  return postFormDataWithProgress<BatchTranscriptionResponse>(
    `${v1}/transcribe/batch`,
    fd,
    onProgress,
    onUploadComplete,
  );
}

export function subtitlesWithProgress(
  file: File,
  onProgress: (pct: number) => void,
  model?: string,
  language?: string,
  onUploadComplete?: () => void,
) {
  const fd = new FormData();
  fd.append("file", file);
  if (model) fd.append("model", model);
  if (language) fd.append("language", language);
  return postFormDataWithProgress<SubtitleResponse>(`${v1}/subtitles/file`, fd, onProgress, onUploadComplete);
}

