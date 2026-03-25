import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Variant = "info" | "success" | "error";

type Toast = { id: string; message: string; variant: Variant };

type Ctx = { notify: (message: string, variant?: Variant) => void };

const NotificationsContext = createContext<Ctx | null>(null);

export function useNotify() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotify must be used within NotificationProvider");
  return ctx.notify;
}

const severity: Record<Variant, "info" | "success" | "error"> = {
  info: "info",
  success: "success",
  error: "error",
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback((message: string, variant: Variant = "info") => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 5200);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <Stack
        role="status"
        aria-live="polite"
        spacing={1}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: (t) => t.zIndex.snackbar,
          maxWidth: 360,
          pointerEvents: "none",
          "& > *": { pointerEvents: "auto" },
        }}
      >
        {toasts.map((t) => (
          <Alert
            key={t.id}
            severity={severity[t.variant]}
            variant="filled"
            onClose={() => dismiss(t.id)}
            sx={{ boxShadow: 4 }}
          >
            {t.message}
          </Alert>
        ))}
      </Stack>
    </NotificationsContext.Provider>
  );
}
