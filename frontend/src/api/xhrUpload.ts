import { getApiBase } from "./client";

function parseXhrDetail(xhr: XMLHttpRequest): string {
  try {
    const data = JSON.parse(xhr.responseText) as { detail?: unknown };
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join("; ");
    }
    return xhr.responseText || xhr.statusText;
  } catch {
    return xhr.statusText || `HTTP ${xhr.status}`;
  }
}

/** POST multipart with upload progress (bytes sent to server). */
export function postFormDataWithProgress<T>(
  path: string,
  formData: FormData,
  onProgress: (percent: number) => void,
  onUploadComplete?: () => void,
): Promise<T> {
  const b = getApiBase();
  const url = `${b}${path.startsWith("/") ? path : `/${path}`}`;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onload = () => {
      onProgress(100);
      onUploadComplete?.();
    };
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.min(99, Math.round((100 * e.loaded) / e.total)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          reject(new Error("Invalid JSON from server"));
        }
      } else {
        reject(new Error(parseXhrDetail(xhr)));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}
