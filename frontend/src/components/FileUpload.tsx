import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useCallback, useId, useState } from "react";
import { ProgressBar } from "@/components/ProgressBar";

export type FileUploadProps = {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFilesChange: (files: File[]) => void;
  files: File[];
  hint?: string;
  maxSizeMb?: number;
  allowedExtensions?: string[];
  uploadProgress?: { value: number; label?: string; indeterminate?: boolean };
};

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeExt(e: string) {
  const x = e.trim().toLowerCase();
  return x.startsWith(".") ? x : `.${x}`;
}

function extensionsFromAccept(accept: string): string[] {
  return accept
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("."))
    .map(normalizeExt);
}

function matchesMime(accept: string, file: File): boolean {
  const type = file.type?.toLowerCase() ?? "";
  if (!accept.trim()) return true;
  const tokens = accept.split(",").map((s) => s.trim()).filter(Boolean);
  for (const t of tokens) {
    if (t.startsWith(".")) continue;
    if (t.endsWith("/*")) {
      const prefix = t.slice(0, -2);
      if (type.startsWith(`${prefix}/`)) return true;
    } else if (type === t.toLowerCase()) {
      return true;
    }
  }
  return false;
}

function matchesExtension(name: string, exts: string[]): boolean {
  const lower = name.toLowerCase();
  return exts.some((e) => lower.endsWith(e));
}

function validateFileTypes(files: File[], accept: string, allowedExtensions?: string[]): string | null {
  const fromAccept = extensionsFromAccept(accept);
  const extSet = [...new Set([...(allowedExtensions?.map(normalizeExt) ?? []), ...fromAccept])];
  for (const f of files) {
    const mimeOk = matchesMime(accept, f);
    const extOk = extSet.length > 0 ? matchesExtension(f.name, extSet) : false;
    if (!mimeOk && !extOk) {
      return `${f.name} is not an allowed type for this field.`;
    }
  }
  return null;
}

export function FileUpload({
  accept = "audio/*,video/*",
  multiple = false,
  disabled,
  onFilesChange,
  files,
  hint = "Drag files here or click to browse",
  maxSizeMb = 500,
  allowedExtensions,
  uploadProgress,
}: FileUploadProps) {
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSet = useCallback(
    (list: File[]) => {
      const maxBytes = maxSizeMb * 1024 * 1024;
      const bad = list.find((f) => f.size > maxBytes);
      if (bad) {
        setError(`${bad.name} exceeds ${maxSizeMb} MB`);
        return;
      }
      const typeErr = validateFileTypes(list, accept, allowedExtensions);
      if (typeErr) {
        setError(typeErr);
        return;
      }
      setError(null);
      onFilesChange(multiple ? list : list.slice(0, 1));
    },
    [accept, allowedExtensions, maxSizeMb, multiple, onFilesChange],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    validateAndSet(multiple ? list : list.slice(0, 1));
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const list = Array.from(e.dataTransfer.files ?? []);
    validateAndSet(multiple ? list : list.slice(0, 1));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box
        component="label"
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        sx={{ display: "block", cursor: disabled ? "not-allowed" : "pointer" }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            textAlign: "center",
            opacity: disabled ? 0.55 : 1,
            borderStyle: "dashed",
            borderWidth: 2,
            borderColor: dragOver ? "primary.main" : "divider",
            bgcolor: (t) => (dragOver ? alpha(t.palette.primary.main, 0.08) : t.palette.action.hover),
            transition: "border-color 0.15s ease, background 0.15s ease",
          }}
        >
          <input
            id={inputId}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            className="sr-only"
            onChange={onInputChange}
          />
          <Typography color="text.secondary">{hint}</Typography>
          {files.length > 0 && (
            <List dense sx={{ mt: 2, textAlign: "left" }}>
              {files.map((f) => (
                <ListItem
                  key={`${f.name}-${f.size}`}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label={`Remove ${f.name}`}
                      disabled={disabled}
                      size="small"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onFilesChange(files.filter((x) => x !== f));
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  }
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    mb: 0.5,
                    bgcolor: "background.default",
                  }}
                >
                  <Typography variant="body2" noWrap sx={{ flex: 1, pr: 4 }}>
                    {f.name}{" "}
                    <Typography component="span" variant="caption" color="text.secondary">
                      {formatSize(f.size)}
                    </Typography>
                  </Typography>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Box>
      {uploadProgress && (
        <ProgressBar
          value={uploadProgress.indeterminate ? 0 : uploadProgress.value}
          indeterminate={uploadProgress.indeterminate}
          label={uploadProgress.label}
        />
      )}
      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}
    </Box>
  );
}
