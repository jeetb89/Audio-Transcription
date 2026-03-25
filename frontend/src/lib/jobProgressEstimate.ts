import type { JobRead } from "@/api/types";

export type JobProgressEstimate = {
  percent: number;
  indeterminate: boolean;
  etaLabel: string;
};

function defaultEtaSeconds(model: string | null): number {
  const m = (model ?? "base").toLowerCase();
  if (m === "tiny") return 90;
  if (m === "small") return 240;
  if (m === "medium") return 420;
  if (m === "large") return 900;
  return 180;
}

export function estimateJobProgress(job: JobRead): JobProgressEstimate {
  if (job.status === "queued") {
    return {
      percent: 0,
      indeterminate: true,
      etaLabel: "Queued — waiting for worker…",
    };
  }

  if (job.status !== "processing") {
    return { percent: 0, indeterminate: false, etaLabel: "" };
  }

  const created = new Date(job.created_at).getTime();
  const elapsedSec = Math.max(0, (Date.now() - created) / 1000);
  const totalGuess = defaultEtaSeconds(job.whisper_model);

  if (elapsedSec > totalGuess * 2) {
    return {
      percent: 0,
      indeterminate: true,
      etaLabel: "Still processing — taking longer than usual…",
    };
  }

  const pct = Math.min(92, Math.floor((elapsedSec / totalGuess) * 100));
  const remaining = Math.max(0, totalGuess - elapsedSec);
  let etaLabel: string;
  if (remaining >= 120) {
    etaLabel = `~${Math.round(remaining / 60)} min remaining (estimate)`;
  } else if (remaining >= 10) {
    etaLabel = `~${Math.round(remaining)}s remaining (estimate)`;
  } else {
    etaLabel = "Finishing up…";
  }

  return { percent: pct, indeterminate: false, etaLabel };
}
