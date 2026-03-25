import type { ReactNode } from "react";
import MuiCard from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";

export function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <MuiCard variant="outlined" sx={{ boxShadow: (t) => t.shadows[8] }}>
      <CardHeader title={title} subheader={subtitle} titleTypographyProps={{ variant: "h6" }} />
      <CardContent sx={{ pt: 0 }}>{children}</CardContent>
    </MuiCard>
  );
}
