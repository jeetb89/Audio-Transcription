import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/api/client";
import type { JobRead } from "@/api/types";
import { jobWebSocketUrl } from "@/lib/jobWebSocketUrl";

type Transport = "ws" | "sse" | "none";

function isTerminal(status: string) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

/**
 * Live job updates: WebSocket first, then Server-Sent Events if the socket fails (proxy, etc.).
 */
export function useJobLive(jobId: string | null, enabled: boolean) {
  const [liveJob, setLiveJob] = useState<JobRead | null>(null);
  const [connected, setConnected] = useState(false);
  const [transport, setTransport] = useState<Transport>("none");
  const sseStarted = useRef(false);

  useEffect(() => {
    if (!jobId || !enabled) {
      setLiveJob(null);
      setConnected(false);
      setTransport("none");
      sseStarted.current = false;
      return;
    }

    sseStarted.current = false;
    const streamUrl = apiUrl(`/api/v1/jobs/${jobId}/stream`);

    let es: EventSource | null = null;

    const startSse = () => {
      if (sseStarted.current) return;
      sseStarted.current = true;
      const source = new EventSource(streamUrl);
      es = source;
      source.onopen = () => {
        setConnected(true);
        setTransport("sse");
      };
      source.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as JobRead | { error: string };
          if ("error" in data) {
            source.close();
            return;
          }
          setLiveJob(data);
          if (isTerminal(data.status)) source.close();
        } catch {
          /* ignore */
        }
      };
      source.onerror = () => {
        setConnected(false);
        source.close();
      };
    };

    const wsUrl = jobWebSocketUrl(jobId);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      setTransport("ws");
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as JobRead | { error: string };
        if ("error" in data) {
          ws.close();
          return;
        }
        setLiveJob(data);
        if (isTerminal(data.status)) ws.close();
      } catch {
        /* ignore */
      }
    };

    ws.onerror = () => {
      ws.close();
      if (!sseStarted.current) startSse();
    };

    ws.onclose = () => {
      if (!sseStarted.current) {
        setConnected(false);
        setTransport("none");
      }
    };

    return () => {
      ws.close();
      es?.close();
      sseStarted.current = false;
      setConnected(false);
      setTransport("none");
    };
  }, [jobId, enabled]);

  return { liveJob, connected, transport };
}
