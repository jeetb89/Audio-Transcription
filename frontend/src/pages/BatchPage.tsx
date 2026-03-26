import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { transcribeBatchWithProgress } from "@/api/transcribeUpload";
import type { BatchTranscriptionResponse } from "@/api/types";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FileUpload } from "@/components/FileUpload";
import { BATCH_MAX_FILES, MAX_UPLOAD_MB } from "@/constants/limits";

const models = ["tiny", "base", "small", "medium", "large"] as const;

const MEDIA_ACCEPT =
  "audio/*,video/*,.mp3,.wav,.m4a,.flac,.webm,.mp4,.mov,.ogg,.aac,.opus";

export function BatchPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [model, setModel] = useState("tiny");
  const [language, setLanguage] = useState("");
  const [result, setResult] = useState<BatchTranscriptionResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadDone, setUploadDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    if (files.length === 0) return;
    setErr(null);
    setBusy(true);
    setUploadPct(0);
    setUploadDone(false);
    setResult(null);
    try {
      const res = await transcribeBatchWithProgress(
        files,
        setUploadPct,
        model,
        language || undefined,
        () => setUploadDone(true),
      );
      setResult(res);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      setUploadDone(false);
      setUploadPct(0);
    }
  }

  const barValue = busy && !uploadDone ? Math.round(uploadPct * 0.42) : 0;

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">
        Batch upload
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: "56ch" }}>
        Up to {BATCH_MAX_FILES} files at once, {MAX_UPLOAD_MB} MB each. One request, one Whisper load. Upload progress
        tracks the multipart body; then the server processes each file.
      </Typography>

      <Card title="Files" subtitle={`Max ${BATCH_MAX_FILES} files, ${MAX_UPLOAD_MB} MB each`}>
        <Stack spacing={2} sx={{ maxWidth: 520 }}>
          <FileUpload
            files={files}
            onFilesChange={setFiles}
            multiple
            maxFiles={BATCH_MAX_FILES}
            disabled={busy}
            accept={MEDIA_ACCEPT}
            allowedExtensions={[".mp3", ".wav", ".m4a", ".flac", ".webm", ".mp4", ".mov", ".ogg", ".aac", ".opus"]}
            maxSizeMb={MAX_UPLOAD_MB}
            uploadProgress={
              busy
                ? !uploadDone
                  ? { value: barValue, label: "Uploading batch payload" }
                  : { indeterminate: true, label: "Transcribing files on server" }
                : undefined
            }
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <FormControl fullWidth>
              <InputLabel id="batch-model-label">Model</InputLabel>
              <Select
                labelId="batch-model-label"
                label="Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={busy}
              >
                {models.map((x) => (
                  <MenuItem key={x} value={x}>
                    {x}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="auto"
              disabled={busy}
              fullWidth
            />
          </Stack>
          <Button disabled={files.length === 0 || busy} onClick={() => void run()}>
            {busy ? "Processing…" : "Run batch"}
          </Button>
          {err && (
            <Typography color="error" variant="body2">
              {err}
            </Typography>
          )}
        </Stack>
      </Card>

      {result && (
        <Card title="Results" subtitle={`${result.items.filter((i) => i.ok).length} / ${result.items.length} ok`}>
          <Stack spacing={2} sx={{ m: 0, p: 0 }}>
            {result.items.map((item) => (
              <Paper key={item.filename} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography fontWeight={700} sx={{ flex: 1 }}>
                    {item.filename}
                  </Typography>
                  <Badge status={item.ok ? "completed" : "failed"} />
                </Stack>
                {item.error && (
                  <Typography color="error" variant="body2">
                    {item.error}
                  </Typography>
                )}
                {item.result && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {item.result.language} · {item.result.processing_time.toFixed(1)}s
                  </Typography>
                )}
                {item.result?.text && (
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      mt: 1,
                      p: 1.5,
                      typography: "caption",
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      maxHeight: 160,
                      overflow: "auto",
                      bgcolor: "background.default",
                      borderRadius: 1,
                    }}
                  >
                    {item.result.text}
                  </Box>
                )}
              </Paper>
            ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
