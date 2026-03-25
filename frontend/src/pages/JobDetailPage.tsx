import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { getJob, patchJob } from "@/api/endpoints";
import type { JobRead } from "@/api/types";
import { Badge } from "@/components/Badge";
import { Button as AppButton } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { TranscriptAudioPlayer, parseWhisperSegments } from "@/components/TranscriptAudioPlayer";
import { useNotify } from "@/context/Notifications";
import { useJobLive } from "@/hooks/useJobLive";
import { estimateJobProgress } from "@/lib/jobProgressEstimate";

function isActive(status: string) {
  return status === "queued" || status === "processing";
}

const AUDIO_EXT = /\.(mp3|wav|m4a|aac|flac|ogg|webm)(\?|$)/i;

function directAudioUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  if (AUDIO_EXT.test(url)) return url.trim();
  return null;
}

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const notify = useNotify();
  const jobId = id ?? "";

  const [syncAudioFile, setSyncAudioFile] = useState<File | null>(null);
  const [syncAudioUrl, setSyncAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!syncAudioFile) {
      setSyncAudioUrl(null);
      return;
    }
    const u = URL.createObjectURL(syncAudioFile);
    setSyncAudioUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [syncAudioFile]);

  const q = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId),
    enabled: !!jobId,
    refetchInterval: (query) => {
      if (!query.state.data) return false;
      const s = query.state.data.status;
      return isActive(s) ? 8000 : false;
    },
  });

  const streamEnabled = !!(q.data && isActive(q.data.status));
  const { liveJob, connected } = useJobLive(jobId, streamEnabled);

  const job: JobRead | undefined = useMemo(() => liveJob ?? q.data, [liveJob, q.data]);

  const prevStatus = useRef<string | null>(null);
  useEffect(() => {
    if (!job) return;
    const prev = prevStatus.current;
    if (prev && prev !== job.status) {
      if (job.status === "completed") notify("Job completed", "success");
      if (job.status === "failed") notify(job.error_message || "Job failed", "error");
      if (job.status === "cancelled") notify("Job cancelled", "info");
    }
    prevStatus.current = job.status;
  }, [job, notify]);

  const cancelMut = useMutation({
    mutationFn: () => patchJob(jobId, { status: "cancelled" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["job", jobId] });
      void qc.invalidateQueries({ queryKey: ["jobs"] });
      void qc.invalidateQueries({ queryKey: ["jobs-summary"] });
    },
  });

  if (!jobId) return <Typography>Missing job id</Typography>;

  if (q.isLoading && !job) return <Typography color="text.secondary">Loading…</Typography>;
  if (q.isError && !job) return <Typography color="error">{(q.error as Error).message}</Typography>;
  if (!job) return null;

  const terminal = ["completed", "failed", "cancelled"].includes(job.status);
  const canCancel = job.status === "queued" || job.status === "processing";
  const est = estimateJobProgress(job);
  const segments = parseWhisperSegments(job.result_segments);
  const urlAudio = directAudioUrl(job.source_url);
  const playerSrc = syncAudioUrl ?? urlAudio;

  return (
    <Stack spacing={3}>
      <Link component={RouterLink} to="/jobs" underline="hover" fontWeight={600}>
        ← Jobs
      </Link>

      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" useFlexGap>
        <Typography variant="h5" component="h1" sx={{ wordBreak: "break-all" }}>
          {job.id}
        </Typography>
        <Badge status={job.status} />
        {streamEnabled && connected && (
          <Chip size="small" label="Live updates" color="primary" variant="outlined" />
        )}
        {canCancel && (
          <AppButton variant="danger" disabled={cancelMut.isPending} onClick={() => cancelMut.mutate()}>
            Mark cancelled
          </AppButton>
        )}
      </Stack>

      {isActive(job.status) && (
        <Box sx={{ maxWidth: 480 }}>
          <ProgressBar
            value={est.indeterminate ? 0 : est.percent}
            indeterminate={est.indeterminate}
            label={`${est.etaLabel}${streamEnabled ? " · live updates" : ""}`}
          />
        </Box>
      )}

      {cancelMut.isError && <Typography color="error">{(cancelMut.error as Error).message}</Typography>}

      {segments.length > 0 && (
        <Card title="Listen & follow transcript" subtitle="Attach a local copy of the audio if the job has no direct URL">
          <Stack spacing={2}>
            <Button variant="outlined" component="label" sx={{ alignSelf: "flex-start" }}>
              Optional: choose local audio for sync
              <input
                type="file"
                hidden
                accept="audio/*,.mp3,.wav,.m4a,.flac,.webm,.ogg"
                onChange={(e) => setSyncAudioFile(e.target.files?.[0] ?? null)}
              />
            </Button>
            {playerSrc ? (
              <TranscriptAudioPlayer audioSrc={playerSrc} segments={segments} title="Synced playback" />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Upload a file above, or use a job whose source URL points to an audio file, to enable the player.
              </Typography>
            )}
          </Stack>
        </Card>
      )}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card title="Metadata" subtitle="Stored fields">
            <Stack spacing={1} component="dl" sx={{ m: 0 }}>
              <MetaRow label="source_type" value={job.source_type} />
              <MetaRow label="filename" value={job.filename ?? "—"} />
              <MetaRow label="source_url" value={job.source_url ?? "—"} multiline />
              <MetaRow
                label="whisper_model / language"
                value={`${job.whisper_model ?? "—"} / ${job.language ?? "—"}`}
              />
              <MetaRow label="provider" value={job.provider ?? "—"} />
              <Box component="dt" sx={{ color: "text.secondary", typography: "caption" }}>
                timestamps
              </Box>
              <Box component="dd" sx={{ m: 0, color: "text.secondary", typography: "body2" }}>
                created {new Date(job.created_at).toLocaleString()}
                <br />
                updated {new Date(job.updated_at).toLocaleString()}
                {job.completed_at && (
                  <>
                    <br />
                    completed {new Date(job.completed_at).toLocaleString()}
                  </>
                )}
              </Box>
            </Stack>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card title="Result" subtitle={job.processing_time_seconds != null ? `${job.processing_time_seconds}s` : "—"}>
            {job.error_message && (
              <Typography color="error" sx={{ mb: 1 }}>
                {job.error_message}
              </Typography>
            )}
            {job.result_text ? (
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  typography: "body2",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  bgcolor: "background.default",
                  borderRadius: 1,
                  border: 1,
                  borderColor: "divider",
                  maxHeight: 360,
                  overflow: "auto",
                }}
              >
                {job.result_text}
              </Box>
            ) : (
              !job.error_message && (
                <Typography color="text.secondary">
                  {terminal ? "No transcript stored." : "Waiting for worker…"}
                </Typography>
              )
            )}
            {job.result_segments && job.result_segments.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                {job.result_segments.length} segments in JSON
              </Typography>
            )}
          </Card>
        </Box>
      </Stack>
    </Stack>
  );
}

function MetaRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <>
      <Typography component="dt" variant="caption" color="text.secondary" sx={{ m: 0 }}>
        {label}
      </Typography>
      <Typography
        component="dd"
        variant="body2"
        sx={{ m: 0, wordBreak: multiline ? "break-all" : undefined }}
      >
        {value}
      </Typography>
    </>
  );
}
