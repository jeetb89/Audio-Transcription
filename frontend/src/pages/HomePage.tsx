import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router-dom";
import { getHealth } from "@/api/endpoints";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";

const quickLinks: { to: string; title: string; description: string }[] = [
  { to: "/transcribe", title: "Transcribe a file", description: "Upload audio or video and run Whisper on your server" },
  { to: "/youtube", title: "YouTube", description: "Paste a link and transcribe the audio track" },
  { to: "/subtitles", title: "SRT subtitles", description: "Generate timed subtitle files from media" },
  { to: "/batch", title: "Batch", description: "Process several files in one request" },
  { to: "/assembly", title: "Upcoming feature", description: "Reserved for a future cloud transcription integration" },
  { to: "/jobs", title: "Jobs", description: "Track status, search, and open saved transcriptions" },
];

export function HomePage() {
  const q = useQuery({ queryKey: ["health"], queryFn: getHealth, retry: 1, refetchInterval: 30_000 });

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontSize: { xs: "2rem", md: "2.75rem" } }}>
          Audio Transcription
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: "56ch", fontSize: "1.0625rem", lineHeight: 1.65 }}>
          Upload media, pull audio from YouTube, export subtitles, or use cloud transcription — from a single workspace.
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems="stretch">
        <Box sx={{ flex: "1 1 280px", minWidth: 0 }}>
          <Card title="Service status" subtitle="Can the app reach your transcription API?">
            <Stack direction="row" alignItems="center" spacing={1.5} minHeight={40}>
              {q.isLoading && (
                <>
                  <CircularProgress size={22} thickness={5} />
                  <Typography color="text.secondary">Checking connection…</Typography>
                </>
              )}
              {q.isError && (
                <>
                  <Badge status="failed" />
                  <Typography color="error" variant="body2" sx={{ flex: 1 }}>
                    {(q.error as Error).message}
                  </Typography>
                </>
              )}
              {q.isSuccess && (
                <>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      boxShadow: (t) => `0 0 14px ${t.palette.primary.main}`,
                      flexShrink: 0,
                    }}
                  />
                  <Typography color="primary" fontWeight={600}>
                    Connected — service is responding
                  </Typography>
                </>
              )}
            </Stack>
          </Card>
        </Box>

        <Box sx={{ flex: "1.4 1 320px", minWidth: 0 }}>
          <Card title="Get started" subtitle="Pick a workflow">
            <List disablePadding sx={{ mx: -2, mb: -1 }}>
              {quickLinks.map((item, i) => (
                <ListItemButton
                  key={item.to}
                  component={RouterLink}
                  to={item.to}
                  divider={i < quickLinks.length - 1}
                  sx={{ py: 1.25, alignItems: "flex-start" }}
                >
                  <ListItemText
                    primary={item.title}
                    secondary={item.description}
                    primaryTypographyProps={{ fontWeight: 600 }}
                    secondaryTypographyProps={{ variant: "body2" }}
                  />
                  <ListItemIcon sx={{ minWidth: 40, justifyContent: "flex-end", mt: 0.25 }}>
                    <ChevronRightIcon color="action" />
                  </ListItemIcon>
                </ListItemButton>
              ))}
            </List>
          </Card>
        </Box>
      </Stack>
    </Stack>
  );
}
