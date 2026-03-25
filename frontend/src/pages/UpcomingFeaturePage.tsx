import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export function UpcomingFeaturePage() {
  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">
        Upcoming feature
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: "56ch" }}>
        Cloud transcription integrations are not available in this build. Local Whisper, YouTube, subtitles, and batch
        flows are ready to use from the navigation bar.
      </Typography>
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <ConstructionOutlinedIcon color="action" sx={{ fontSize: 40, opacity: 0.85 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Not enabled
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This section is reserved for a future release. The API routes for the previous provider are turned off on
                the server.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
