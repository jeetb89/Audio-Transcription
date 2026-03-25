import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Link from "@mui/material/Link";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { createJob, getJobsSummary, listJobs } from "@/api/endpoints";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { useNotify } from "@/context/Notifications";

const sourceTypes = [
  "file_upload",
  "youtube",
  "subtitles",
  "batch",
] as const;

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "queued", label: "Pending (queued)" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const statOrder: { key: string; label: string }[] = [
  { key: "total", label: "All jobs" },
  { key: "queued", label: "Queued" },
  { key: "processing", label: "Processing" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
  { key: "cancelled", label: "Cancelled" },
];

function isActiveJob(status: string) {
  return status === "queued" || status === "processing";
}

export function JobsPage() {
  const qc = useQueryClient();
  const notify = useNotify();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [displayLimit, setDisplayLimit] = useState(25);
  const [liveUpdates, setLiveUpdates] = useState(true);

  const apiStatus = statusFilter || undefined;
  const searchQ = search.trim() || undefined;

  useEffect(() => {
    setDisplayLimit(25);
  }, [statusFilter, search]);

  const summaryQ = useQuery({
    queryKey: ["jobs-summary"],
    queryFn: getJobsSummary,
    enabled: liveUpdates,
    refetchInterval: liveUpdates ? 3500 : false,
    retry: (n, e) => {
      const msg = (e as Error).message ?? "";
      if (msg.includes("503") || msg.toLowerCase().includes("database")) return false;
      return n < 2;
    },
  });

  const q = useQuery({
    queryKey: ["jobs", { status: apiStatus, limit: displayLimit, q: searchQ }],
    queryFn: () => listJobs({ limit: displayLimit, offset: 0, status: apiStatus, q: searchQ }),
    retry: (n, e) => {
      const msg = (e as Error).message ?? "";
      if (msg.includes("503") || msg.toLowerCase().includes("database")) return false;
      return n < 2;
    },
    refetchInterval: (query) => {
      if (!liveUpdates) return false;
      const data = query.state.data;
      if (!data?.items?.length) return 10_000;
      const active = data.items.some((j) => isActiveJob(j.status));
      return active ? 3500 : 12_000;
    },
  });

  const [st, setSt] = useState<(typeof sourceTypes)[number]>("file_upload");
  const [filename, setFilename] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [wm, setWm] = useState("base");
  const [lang, setLang] = useState("");
  const [userId, setUserId] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createJob({
        source_type: st,
        filename: filename || null,
        source_url: sourceUrl || null,
        whisper_model: wm || null,
        language: lang || null,
        user_id: userId.trim() || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["jobs"] });
      void qc.invalidateQueries({ queryKey: ["jobs-summary"] });
      setFilename("");
      setSourceUrl("");
      notify("Job registered", "success");
    },
  });

  const dbError = useMemo(() => {
    if (!q.isError) return null;
    const m = (q.error as Error).message;
    if (m.includes("503") || m.toLowerCase().includes("database")) {
      return "Database is not configured on the API (set DATABASE_URL and run migrations).";
    }
    return m;
  }, [q.isError, q.error]);

  const summary = summaryQ.data;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} spacing={2}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Job dashboard
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: "56ch" }}>
            Live counts refresh automatically while jobs are running. Search by id, filename, or URL. Open a job to follow
            progress and results in real time.
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Checkbox checked={liveUpdates} onChange={(e) => setLiveUpdates(e.target.checked)} color="primary" />
          }
          label="Live updates"
          sx={{ color: "text.secondary", flexShrink: 0 }}
        />
      </Stack>

      {!dbError && summary && (
        <Stack direction="row" flexWrap="wrap" gap={1.5} useFlexGap>
          {statOrder.map(({ key, label }) => {
            const value = key === "total" ? summary.total : summary.by_status[key] ?? 0;
            return (
              <Paper key={key} variant="outlined" sx={{ p: 2, flex: "1 1 140px", minWidth: 120 }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {label}
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 700, mt: 0.5 }}>
                  {value}
                </Typography>
              </Paper>
            );
          })}
        </Stack>
      )}

      {summaryQ.isError && !dbError && liveUpdates && (
        <Typography color="text.secondary" variant="body2">
          Summary unavailable: {(summaryQ.error as Error).message}
        </Typography>
      )}

      <Card title="Register a job" subtitle="Create a row for workers or manual tracking">
        <Stack direction="row" flexWrap="wrap" gap={1.5} useFlexGap sx={{ "& > *": { flex: "1 1 200px", minWidth: 0 } }}>
          <FormControl fullWidth>
            <InputLabel id="job-src-type-label">Source type</InputLabel>
            <Select
              labelId="job-src-type-label"
              label="Source type"
              value={st}
              onChange={(e) => setSt(e.target.value as (typeof sourceTypes)[number])}
            >
              {sourceTypes.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Filename" value={filename} onChange={(e) => setFilename(e.target.value)} placeholder="optional" fullWidth />
          <TextField label="Source URL" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="optional" fullWidth />
          <TextField label="Whisper model" value={wm} onChange={(e) => setWm(e.target.value)} fullWidth />
          <TextField label="Language" value={lang} onChange={(e) => setLang(e.target.value)} placeholder="optional" fullWidth />
          <TextField label="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="UUID, optional" fullWidth />
          <Box sx={{ display: "flex", alignItems: "flex-end" }}>
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? "Creating…" : "Create job"}
            </Button>
          </Box>
        </Stack>
        {create.isError && (
          <Typography color="error" variant="body2" sx={{ mt: 1.5 }}>
            {(create.error as Error).message}
          </Typography>
        )}
      </Card>

      <Card title="Recent jobs" subtitle={q.data ? `${q.data.total} matching filter` : "—"}>
        <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center" useFlexGap sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="job-filter-label">Status</InputLabel>
            <Select
              labelId="job-filter-label"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_FILTER_OPTIONS.map((s) => (
                <MenuItem key={s.value || "all"} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            type="search"
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="id, filename, URL…"
            sx={{ flex: "1 1 200px", minWidth: 200, maxWidth: 360 }}
          />
          <Button variant="ghost" onClick={() => void q.refetch()}>
            Refresh table
          </Button>
        </Stack>

        {q.isLoading && <Typography color="text.secondary">Loading…</Typography>}
        {dbError && (
          <Typography sx={{ color: "warning.main" }}>{dbError}</Typography>
        )}
        {q.isError && !dbError && <Typography color="error">{(q.error as Error).message}</Typography>}

        {q.data && (
          <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Progress</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Label</TableCell>
                  <TableCell>Updated</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {q.data.items.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell>
                      <Badge status={job.status} />
                    </TableCell>
                    <TableCell>
                      {isActiveJob(job.status) ? (
                        <ProgressBar thin indeterminate />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{job.source_type}</TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 240,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {job.filename || job.source_url || "—"}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(job.updated_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Link component={RouterLink} to={`/jobs/${job.id}`} fontWeight={600}>
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {q.data.items.length === 0 && (
              <Box sx={{ p: 2 }}>
                <Typography color="text.secondary">No jobs yet.</Typography>
              </Box>
            )}
            {q.data.items.length > 0 && q.data.items.length < q.data.total && displayLimit < 100 && (
              <Box sx={{ p: 2, pt: 0 }}>
                <Button
                  variant="ghost"
                  onClick={() => setDisplayLimit((n) => Math.min(n + 25, 100))}
                  disabled={q.isFetching}
                >
                  {q.isFetching ? "Loading…" : `Load more (${q.data.items.length} / ${q.data.total})`}
                </Button>
              </Box>
            )}
          </TableContainer>
        )}
      </Card>
    </Stack>
  );
}
