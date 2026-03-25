import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#3dd6c3", contrastText: "#07090d" },
    secondary: { main: "#2a9d8f" },
    error: { main: "#ef476f" },
    warning: { main: "#f4a261" },
    background: {
      default: "#07090d",
      paper: "#0f1419",
    },
    divider: "#243040",
    text: {
      primary: "#e8edf4",
      secondary: "#8b9cb3",
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif',
    fontFamilyMonospace: 'ui-monospace, "Cascadia Code", monospace',
    h1: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600, letterSpacing: "-0.02em" },
    h2: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600, letterSpacing: "-0.02em" },
    h3: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600, letterSpacing: "-0.02em" },
    h4: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600, letterSpacing: "-0.02em" },
    h5: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    h6: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#07090d",
          backgroundImage: `
            radial-gradient(ellipse 120% 80% at 10% -20%, rgba(61, 214, 195, 0.12), transparent 50%),
            radial-gradient(ellipse 80% 60% at 100% 0%, rgba(239, 71, 111, 0.06), transparent 45%)
          `,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          borderColor: "#243040",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
      },
    },
  },
});
