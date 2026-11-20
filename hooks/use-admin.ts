"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminService } from "@/services/admin.service";

export const adminActions = adminService;

export function useAdminData<T>(load: () => Promise<T>, pollMs = 15_000) {
  const loader = useRef(load);
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setData(await loader.current());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loader.current = load;
  }, [load]);

  useEffect(() => {
    void refresh();
    if (pollMs <= 0) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs, refresh]);

  return { data, loading, error, refresh };
}

export type {
  AdminUserItem,
  AdminUsersResponse,
  AdminStats,
  AdminDepartmentItem,
  AdminScheduleItem,
} from "@/services/admin.service";
