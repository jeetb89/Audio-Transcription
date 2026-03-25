import Chip from "@mui/material/Chip";

const colorMap: Record<string, "default" | "primary" | "warning" | "success" | "error"> = {
  queued: "default",
  processing: "warning",
  completed: "success",
  failed: "error",
  cancelled: "default",
};

export function Badge({ status }: { status: string }) {
  const color = colorMap[status] ?? "default";
  return (
    <Chip
      label={status}
      size="small"
      color={color}
      variant="outlined"
      sx={{ fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
    />
  );
}
