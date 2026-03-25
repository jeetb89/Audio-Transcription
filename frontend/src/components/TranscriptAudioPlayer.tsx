import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import ListItemButton from "@mui/material/ListItemButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type TranscriptSegment = { start: number; end: number; text: string };

export function parseWhisperSegments(raw: Record<string, unknown>[] | null | undefined): TranscriptSegment[] {
  if (!raw?.length) return [];
  const out: TranscriptSegment[] = [];
  for (const s of raw) {
    const start = typeof s.start === "number" ? s.start : Number(s.start);
    const end = typeof s.end === "number" ? s.end : Number(s.end);
    const text = typeof s.text === "string" ? s.text : "";
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    out.push({ start, end, text: text.trim() });
  }
  return out;
}

function words(text: string): string[] {
  return text.trim() ? text.trim().split(/\s+/) : [];
}

function activeWordIndex(seg: TranscriptSegment, t: number): number {
  const w = words(seg.text);
  if (w.length === 0) return -1;
  const span = Math.max(0.001, seg.end - seg.start);
  const r = Math.max(0, Math.min(1, (t - seg.start) / span));
  return Math.min(w.length - 1, Math.floor(r * w.length));
}

function activeSegmentIndex(segments: TranscriptSegment[], t: number): number {
  const i = segments.findIndex((s) => t >= s.start && t < s.end);
  if (i >= 0) return i;
  for (let j = segments.length - 1; j >= 0; j--) {
    if (t >= segments[j].start) return j;
  }
  return 0;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

type Props = {
  audioSrc: string | null;
  segments: TranscriptSegment[];
  title?: string;
};

export function TranscriptAudioPlayer({ audioSrc, segments, title = "Playback" }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [duration, setDuration] = useState(0);

  const segIdx = useMemo(() => activeSegmentIndex(segments, t), [segments, t]);
  const activeSeg = segments[segIdx];
  const wIdx = activeSeg ? activeWordIndex(activeSeg, t) : -1;

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-seg-idx="${segIdx}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [segIdx]);

  const onTime = useCallback(() => {
    const a = audioRef.current;
    if (a) setT(a.currentTime);
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !audioSrc) return;
    a.load();
    setT(0);
  }, [audioSrc]);

  if (!audioSrc || segments.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ width: "100%", mb: 1.5 }}>
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="metadata"
          controls
          style={{ width: "100%" }}
          onTimeUpdate={onTime}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        />
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel id="playback-speed-label">Speed</InputLabel>
          <Select
            labelId="playback-speed-label"
            label="Speed"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            {SPEED_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}×
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {formatClock(t)} / {formatClock(duration || 0)}
        </Typography>
      </Box>
      <Box
        ref={listRef}
        sx={{
          maxHeight: 280,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          pr: 0.5,
        }}
      >
        {segments.map((seg, i) => {
          const isActive = i === segIdx;
          const ws = words(seg.text);
          const wi = isActive ? wIdx : -1;
          return (
            <ListItemButton
              key={`${seg.start}-${seg.end}-${i}`}
              data-seg-idx={i}
              selected={isActive}
              onClick={() => {
                const a = audioRef.current;
                if (a) {
                  a.currentTime = seg.start;
                  void a.play();
                }
              }}
              sx={{
                alignItems: "flex-start",
                flexDirection: "column",
                border: 1,
                borderColor: isActive ? "primary.main" : "divider",
                borderRadius: 1,
                bgcolor: (th) => (isActive ? alpha(th.palette.primary.main, 0.08) : th.palette.background.default),
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                {formatClock(seg.start)} → {formatClock(seg.end)}
              </Typography>
              <Typography component="span" variant="body2" sx={{ textAlign: "left", lineHeight: 1.45 }}>
                {ws.map((word, j) => (
                  <span key={j}>
                    <Box
                      component="span"
                      sx={{
                        bgcolor: (th) =>
                          isActive && j === wi ? alpha(th.palette.primary.main, 0.35) : "transparent",
                        borderRadius: 0.5,
                        px: 0.125,
                      }}
                    >
                      {word}
                    </Box>
                    {j < ws.length - 1 ? " " : ""}
                  </span>
                ))}
              </Typography>
            </ListItemButton>
          );
        })}
      </Box>
    </Paper>
  );
}

function formatClock(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
