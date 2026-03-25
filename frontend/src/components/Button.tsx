import MuiButton, { type ButtonProps as MuiButtonProps } from "@mui/material/Button";

export type ButtonProps = Omit<MuiButtonProps, "variant" | "color"> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({ variant = "primary", ...rest }: ButtonProps) {
  if (variant === "primary") {
    return <MuiButton variant="contained" color="primary" {...rest} />;
  }
  if (variant === "ghost") {
    return <MuiButton variant="outlined" color="inherit" {...rest} />;
  }
  return <MuiButton variant="outlined" color="error" {...rest} />;
}
