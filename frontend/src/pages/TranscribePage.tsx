import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { transcribeFileWithProgress } from "@/api/transcribeUpload";
import type { TranscriptionResponse } from "@/api/types";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FileUpload } from "@/components/FileUpload";
import { TranscriptAudioPlayer, parseWhisperSegments } from "@/components/TranscriptAudioPlayer";

const models = ["tiny", "base", "small", "medium", "large"] as const;

const ACCEPT =
  "audio/*,video/*,.mp3,.wav,.m4a,.flac,.webm,.mp4,.ogg,.aac,.opus";

export function TranscribePage() {
  const [files, setFiles] = useState<File[]>([]);
  const file = files[0] ?? null;
  const [model, setModel] = useState<string>("base");
  const [language, setLanguage] = useState("");
  const [result, setResult] = useState<TranscriptionResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadDone, setUploadDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setAudioUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setAudioUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  async function run() {
    if (!file) return;
    setErr(null);
    setBusy(true);
    setUploadPct(0);
    setUploadDone(false);
    setResult(null);
    try {
      const res = await transcribeFileWithProgress(
        file,
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
  const segments = result ? parseWhisperSegments(result.segments) : [];

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">
        Transcribe file
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: "56ch" }}>
        Drag-and-drop or pick a file. Upload progress reflects bytes sent to the API; the bar then pulses while Whisper
        runs on the server.
      </Typography>

      <Card title="Upload" subtitle="MP3, WAV, M4A, FLAC, and more">
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          <FileUpload
            files={files}
            onFilesChange={setFiles}
            multiple={false}
            disabled={busy}
            accept={ACCEPT}
            allowedExtensions={[".mp3", ".wav", ".m4a", ".flac", ".webm", ".mp4", ".ogg", ".aac", ".opus", ".mov"]}
            uploadProgress={
              busy
                ? !uploadDone
                  ? { value: barValue, label: "Uploading to API" }
                  : { indeterminate: true, label: "Transcribing (Whisper on server)" }
                : undefined
            }
          />
          <FormControl fullWidth>
            <InputLabel id="tr-model-label">Model</InputLabel>
            <Select
              labelId="tr-model-label"
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
            label="Language (optional)"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="e.g. en"
            disabled={busy}
            fullWidth
          />
          <Button disabled={!file || busy} onClick={() => void run()}>
            {busy ? "Working…" : "Run Whisper"}
          </Button>
          {err && (
            <Typography color="error" variant="body2">
              {err}
            </Typography>
          )}
        </Stack>
      </Card>

      {result && (
        <Stack spacing={2}>
          <Card title="Result" subtitle={`${result.language} · ${result.processing_time.toFixed(1)}s`}>
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
              {result.text}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
              {result.segments?.length ?? 0} segments returned
            </Typography>
          </Card>
          {audioUrl && segments.length > 0 && (
            <TranscriptAudioPlayer audioSrc={audioUrl} segments={segments} title="Playback synced to transcript" />
          )}
        </Stack>
      )}
    </Stack>
  );
}
