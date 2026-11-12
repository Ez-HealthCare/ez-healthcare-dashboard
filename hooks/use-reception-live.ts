import { useEffect } from "react";
import { clinicalActions } from "./use-clinical";

function receptionSocketUrl() {
  const configured = process.env.NEXT_PUBLIC_RECEPTION_WS_URL;
  if (configured) return configured;
  if (location.protocol === "http:" && ["localhost", "127.0.0.1"].includes(location.hostname)) {
    return "ws://" + location.hostname + ":3000/api/reception/live";
  }
}

export function useReceptionLive(enabled: boolean, refresh: () => Promise<void>) {
  useEffect(() => {
    const url = enabled ? receptionSocketUrl() : undefined;
    if (!url) return;
    let stopped = false;
    let socket: WebSocket | undefined;
    let retry: number | undefined;
    let delay = 1_000;

    function reconnect() {
      if (stopped) return;
      retry = window.setTimeout(() => void connect(), delay);
      delay = Math.min(delay * 2, 30_000);
    }

    async function connect() {
      try {
        const { token } = await clinicalActions.receptionLiveGrant();
        if (stopped) return;
        socket = new WebSocket(url!, ["reception-live", token]);
        socket.onopen = () => {
          delay = 1_000;
          void refresh();
        };
        socket.onmessage = (event) => {
          if (
            event.data === '{"type":"reception.queue.updated"}' ||
            event.data === '{"type":"triage.queue.updated"}' ||
            event.data === '{"type":"clinic.queue.updated"}'
          ) {
            void refresh();
          }
        };
        socket.onclose = reconnect;
      } catch {
        reconnect();
      }
    }

    void connect();
    return () => {
      stopped = true;
      if (retry !== undefined) window.clearTimeout(retry);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.close();
      }
    };
  }, [enabled, refresh]);
}
