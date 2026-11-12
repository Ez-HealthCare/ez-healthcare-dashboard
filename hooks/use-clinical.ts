"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clinicalService } from "@/services/clinical.service";

export const clinicalActions = clinicalService;

export function useClinicalData<T>(load: () => Promise<T>, pollMs = 5_000, refreshOnFocus = false) {
  const loader = useRef(load);
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>();
  const refresh = useCallback(async () => {
    try {
      setData(await loader.current());
      setLastUpdatedAt(new Date().toISOString());
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loader.current = load;
  }, [load]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs, refresh]);

  useEffect(() => {
    if (!refreshOnFocus) return;
    let frame: number | undefined;
    const refreshVisible = () => {
      if (document.visibilityState !== "visible" || frame !== undefined) return;
      frame = window.requestAnimationFrame(() => {
        frame = undefined;
        void refresh();
      });
    };
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [refresh, refreshOnFocus]);

  return { data, loading, error, refresh, lastUpdatedAt };
}
