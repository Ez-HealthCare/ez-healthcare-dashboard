"use client";

import { formatDateTime } from "@/lib/display-format";

import { useRef, useState } from "react";
import Link from "next/link";
import { Alert, Button, Empty } from "antd";
import { clinicalActions } from "@/hooks/use-clinical";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import { notificationLink } from "@/lib/notification-link";
import type { NotificationItem } from "@/lib/types/clinical";
import styles from "./staff-workspace-shell.module.css";

export function StaffNotifications({
  workspace,
  data,
  loading,
  error,
  refresh,
  onNavigate,
}: {
  workspace: "doctor" | "nurse" | "receptionist";
  data?: NotificationItem[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  onNavigate: () => void;
}) {
  const lock = useRef(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const unread = data?.some((item) => !item.readAt);
  const readAll = async () => {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setActionError("");
    try {
      await clinicalActions.markAllRead();
      await refresh();
    } catch (error) {
      setActionError(clinicalErrorMessage(error));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  return (
    <div id="staff-notifications" data-workspace="staff" className={styles.notifications}>
      {error && (
        <Alert
          type="error"
          title="Không tải được thông báo"
          description={error}
          action={<Button onClick={() => void refresh()}>Thử lại</Button>}
        />
      )}
      {actionError && (
        <Alert type="error" title="Chưa đánh dấu được thông báo" description={actionError} />
      )}
      <Button
        aria-label="Đánh dấu tất cả đã đọc"
        aria-busy={saving}
        disabled={!unread}
        loading={saving}
        onClick={() => void readAll()}
      >
        Đánh dấu tất cả đã đọc
      </Button>
      {loading ? (
        <p role="status">Đang tải thông báo…</p>
      ) : data?.length ? (
        data.map((item) => {
          const href = notificationLink(workspace, item.visitId);
          return (
            <article key={item.id}>
              <span className={styles.notificationState}>
                {item.readAt ? "Đã đọc" : "Chưa đọc"}
              </span>
              <strong>{item.title}</strong>
              <p>{item.message}</p>
              <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
              {href && (
                <Link onClick={onNavigate} className={styles.notificationLink} href={href}>
                  Xem lượt khám liên quan
                </Link>
              )}
            </article>
          );
        })
      ) : (
        !error && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo" />
      )}
    </div>
  );
}
