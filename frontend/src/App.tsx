import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { NotificationProvider } from "@/context/Notifications";
import { appTheme } from "@/theme/muiTheme";
import { UpcomingFeaturePage } from "@/pages/UpcomingFeaturePage";
import { BatchPage } from "@/pages/BatchPage";
import { HomePage } from "@/pages/HomePage";
import { JobDetailPage } from "@/pages/JobDetailPage";
import { JobsPage } from "@/pages/JobsPage";
import { SubtitlesPage } from "@/pages/SubtitlesPage";
import { TranscribePage } from "@/pages/TranscribePage";
import { YouTubePage } from "@/pages/YouTubePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={appTheme}>
        <CssBaseline enableColorScheme />
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="transcribe" element={<TranscribePage />} />
                <Route path="youtube" element={<YouTubePage />} />
                <Route path="subtitles" element={<SubtitlesPage />} />
                <Route path="batch" element={<BatchPage />} />
                <Route path="assembly" element={<UpcomingFeaturePage />} />
                <Route path="jobs" element={<JobsPage />} />
                <Route path="jobs/:id" element={<JobDetailPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
