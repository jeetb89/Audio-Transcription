import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { subtitlesWithProgress } from "@/api/transcribeUpload";
import type { SubtitleResponse } from "@/api/types";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FileUpload } from "@/components/FileUpload";
import { MAX_UPLOAD_MB } from "@/constants/limits";

const models = ["tiny", "base", "small", "medium", "large"] as const;

const MEDIA_ACCEPT =
  "audio/*,video/*,.mp3,.wav,.m4a,.flac,.webm,.mp4,.mov,.ogg,.aac,.opus";

export function SubtitlesPage() {
  const [files, setFiles] = useState<File[]>([]);
  const file = files[0] ?? null;
  const [model, setModel] = useState("tiny");
  const [language, setLanguage] = useState("");
  const [result, setResult] = useState<SubtitleResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadDone, setUploadDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const downloadHref = useMemo(() => {
    if (!result) return "";
    return URL.createObjectURL(new Blob([result.srt], { type: "text/plain;charset=utf-8" }));
  }, [result]);

  useEffect(() => {
    return () => {
      if (downloadHref) URL.revokeObjectURL(downloadHref);
    };
  }, [downloadHref]);

  async function run() {
    if (!file) return;
    setErr(null);
    setBusy(true);
    setUploadPct(0);
    setUploadDone(false);
    setResult(null);
    try {
      const res = await subtitlesWithProgress(
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

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">
        SRT subtitles
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: "56ch" }}>
        Whisper segments are formatted as SubRip. Max file size {MAX_UPLOAD_MB} MB. Upload progress covers the request
        body; generation happens on the server.
      </Typography>

      <Card title="Source media" subtitle={`Audio or video — max ${MAX_UPLOAD_MB} MB`}>
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          <FileUpload
            files={files}
            onFilesChange={setFiles}
            multiple={false}
            disabled={busy}
            accept={MEDIA_ACCEPT}
            allowedExtensions={[".mp3", ".wav", ".m4a", ".flac", ".webm", ".mp4", ".mov", ".ogg", ".aac", ".opus"]}
            maxSizeMb={MAX_UPLOAD_MB}
            uploadProgress={
              busy
                ? !uploadDone
                  ? { value: barValue, label: "Uploading media" }
                  : { indeterminate: true, label: "Building SRT on server" }
                : undefined
            }
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <FormControl fullWidth>
              <InputLabel id="sub-model-label">Model</InputLabel>
              <Select
                labelId="sub-model-label"
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
          <Button disabled={!file || busy} onClick={() => void run()}>
            {busy ? "Working…" : "Generate SRT"}
          </Button>
          {err && (
            <Typography color="error" variant="body2">
              {err}
            </Typography>
          )}
        </Stack>
      </Card>

      {result && (
        <Card title="Output" subtitle={`${result.language} · ${result.processing_time.toFixed(1)}s`}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            <Button
              variant="ghost"
              onClick={() => {
                void navigator.clipboard.writeText(result.srt);
              }}
            >
              Copy SRT
            </Button>
            <Button component="a" href={downloadHref || "#"} download="subtitles.srt" variant="outlined">
              Download .srt
            </Button>
          </Stack>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              typography: "caption",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              bgcolor: "background.default",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
              maxHeight: 320,
              overflow: "auto",
            }}
          >
            {result.srt}
          </Box>
        </Card>
      )}
    </Stack>
  );
}
