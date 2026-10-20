"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clinicalService } from "@/services/clinical.service";

export const clinicalActions = clinicalService;

export function useClinicalData<T>(load: () => Promise<T>, pollMs = 5_000) {
  const loader = useRef(load);
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      setData(await loader.current());
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

  return { data, loading, error, refresh };
}
