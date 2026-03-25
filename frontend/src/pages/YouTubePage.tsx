import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { transcribeYouTube } from "@/api/endpoints";
import type { TranscriptionResponse } from "@/api/types";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

const models = ["tiny", "base", "small", "medium", "large"] as const;

export function YouTubePage() {
  const [url, setUrl] = useState("");
  const [model, setModel] = useState("base");
  const [language, setLanguage] = useState("");
  const [result, setResult] = useState<TranscriptionResponse | null>(null);

  const m = useMutation({
    mutationFn: () => transcribeYouTube(url.trim(), model, language || undefined),
    onSuccess: setResult,
  });

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">
        YouTube
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: "56ch" }}>
        Downloads best audio via yt-dlp, extracts MP3, then runs Whisper. Requires FFmpeg on the server.
      </Typography>

      <Card title="Video URL" subtitle="Paste a public YouTube link">
        <Stack spacing={2} sx={{ maxWidth: 520 }}>
          <TextField
            label="YouTube URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            fullWidth
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <FormControl fullWidth>
              <InputLabel id="yt-model-label">Model</InputLabel>
              <Select
                labelId="yt-model-label"
                label="Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
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
              fullWidth
            />
          </Stack>
          <Button disabled={!url.trim() || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Downloading & transcribing…" : "Transcribe"}
          </Button>
          {m.isError && (
            <Typography color="error" variant="body2">
              {(m.error as Error).message}
            </Typography>
          )}
        </Stack>
      </Card>

      {result && (
        <Card title="Transcript" subtitle={`${result.language} · ${result.processing_time.toFixed(1)}s`}>
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
              maxHeight: 400,
              overflow: "auto",
            }}
          >
            {result.text}
          </Box>
        </Card>
      )}
    </Stack>
  );
}
