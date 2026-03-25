import { getApiBase } from "@/api/client";

/** Build ws/wss URL for job live updates (matches Vite `/api` proxy in dev). */
export function jobWebSocketUrl(jobId: string): string {
  const base = getApiBase();
  const path = `/api/v1/jobs/${jobId}/ws`;
  if (base) {
    const u = new URL(base, typeof window !== "undefined" ? window.location.href : "http://localhost");
    const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${u.host}${path}`;
  }
  if (typeof window === "undefined") return `ws://localhost${path}`;
  const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${window.location.host}${path}`;
}
