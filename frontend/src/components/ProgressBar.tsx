import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";

type Props = {
  /** 0–100 when not indeterminate */
  value?: number;
  indeterminate?: boolean;
  label?: string;
  thin?: boolean;
};

export function ProgressBar({ value = 0, indeterminate, label, thin }: Props) {
  return (
    <Box sx={{ width: "100%" }}>
      {label && (
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          {!indeterminate && (
            <Typography variant="caption" color="text.secondary">
              {Math.round(value)}%
            </Typography>
          )}
        </Box>
      )}
      <LinearProgress
        variant={indeterminate ? "indeterminate" : "determinate"}
        value={indeterminate ? undefined : Math.min(100, Math.max(0, value))}
        sx={{
          height: thin ? 4 : 8,
          borderRadius: 999,
          bgcolor: "background.default",
          "& .MuiLinearProgress-bar": { borderRadius: 999 },
        }}
      />
    </Box>
  );
}
