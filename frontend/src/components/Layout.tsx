import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { NavLink, Outlet } from "react-router-dom";

const nav = [
  { to: "/", label: "Overview" },
  { to: "/transcribe", label: "Upload" },
  { to: "/youtube", label: "YouTube" },
  { to: "/subtitles", label: "Subtitles" },
  { to: "/batch", label: "Batch" },
  { to: "/assembly", label: "Upcoming feature" },
  { to: "/jobs", label: "Jobs" },
];

export function Layout() {
  return (
    <Box sx={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: alpha("#0f1419", 0.85),
          backdropFilter: "blur(12px)",
        }}
      >
        <Toolbar sx={{ maxWidth: 1120, width: "100%", mx: "auto", flexWrap: "wrap", gap: 1, py: 1 }}>
          <Typography
            component={NavLink}
            to="/"
            variant="h6"
            sx={{
              mr: 2,
              fontFamily: "Fraunces, Georgia, serif",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              textDecoration: "none",
              color: "text.primary",
              "&:hover": { color: "primary.main" },
            }}
          >
            Transcribe
            <Box component="span" sx={{ color: "primary.main" }}>
              .
            </Box>
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {nav.map(({ to, label }) => (
              <Button
                key={to}
                component={NavLink}
                to={to}
                end={to === "/"}
                color="inherit"
                size="small"
                sx={{
                  borderRadius: 999,
                  color: "text.secondary",
                  textTransform: "none",
                  fontWeight: 500,
                  "&[aria-current='page']": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": { bgcolor: "primary.dark" },
                  },
                }}
              >
                {label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1, width: "100%", maxWidth: 1120, mx: "auto", px: { xs: 2, sm: 3 }, py: 4, pb: 6 }}>
        <Outlet />
      </Box>
      <Box
        component="footer"
        sx={{
          borderTop: 1,
          borderColor: "divider",
          py: 2,
          px: 2,
          textAlign: "center",
          color: "text.secondary",
          typography: "body2",
        }}
      >
        Local Whisper, YouTube, subtitles, and batch — one workspace
      </Box>
    </Box>
  );
}
