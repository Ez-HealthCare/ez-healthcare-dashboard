"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Empty, Popover, Spin, Tabs } from "antd";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { useNotificationFeed } from "@/hooks/use-notification-feed";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import { formatDateTime } from "@/lib/display-format";
import { patientRecordLink } from "@/lib/visit-status";
import type { NotificationItem } from "@/lib/types/clinical";
import { PatientRefreshButton } from "./patient-refresh-button";
import { PatientIcon } from "./patient-icon";
import styles from "./patient-notifications.module.css";

type Filter = "all" | "unread" | "read";

export function PatientNotifications({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const notifications = useClinicalData(
    () => clinicalActions.notificationPage({ limit: 1 }),
    15_000
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [popupReady, setPopupReady] = useState(false);
  const feed = useNotificationFeed(open, filter);
  const scrollRoot = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string>();
  const [readError, setReadError] = useState("");
  const lock = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onOpenChange(false);
      trigger.current?.focus();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open, onOpenChange]);
  const visible = feed.items;
  const isRead = (item: NotificationItem) => !!item.readAt;
  const unreadCount = notifications.data?.unreadCount;
  const countsAvailable =
    !notifications.error && unreadCount != null && notifications.data?.total != null;
  const countFailure = !notifications.loading && !countsAvailable;
  const { hasMore, loading, loadingMore, error: feedError, loadMore } = feed;
  const itemCount = feed.items.length;
  const refreshCounts = notifications.refresh;
  useEffect(() => {
    if (open) void refreshCounts();
  }, [open, refreshCounts]);
  useEffect(() => {
    if (
      !open ||
      !popupReady ||
      !hasMore ||
      loading ||
      loadingMore ||
      feedError ||
      busy ||
      !scrollRoot.current ||
      !sentinel.current ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { root: scrollRoot.current, rootMargin: "0px 0px 48px 0px", threshold: 0 }
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [
    open,
    popupReady,
    filter,
    itemCount,
    hasMore,
    loading,
    loadingMore,
    feedError,
    loadMore,
    busy,
  ]);

  async function markRead(item?: NotificationItem) {
    if (lock.current || (item && isRead(item)) || (!item && !countsAvailable)) return;
    lock.current = true;
    setBusy(item?.id || "all");
    setReadError("");
    try {
      if (item) await clinicalActions.markNotificationRead(item.id);
      else await clinicalActions.markAllRead();
      feed.acknowledge(item?.id);
      await notifications.refresh();
    } catch (error) {
      setReadError(clinicalErrorMessage(error));
    } finally {
      lock.current = false;
      setBusy(undefined);
    }
  }

  const close = () => {
    onOpenChange(false);
    trigger.current?.focus();
  };
  const list = (
    <div
      className={styles.list}
      ref={scrollRoot}
      role="region"
      aria-label="Danh sách thông báo"
      tabIndex={0}
      aria-busy={feed.loading || feed.loadingMore}
    >
      {feed.loading ? (
        <div className={styles.loading}>
          <Spin aria-label="Đang tải thông báo" />
        </div>
      ) : visible.length ? (
        <ul>
          {visible.map((item) => {
            const read = isRead(item);
            return (
              <li key={item.id} className={styles.item} data-read={read}>
                <span className={styles.itemIcon}>
                  <PatientIcon name={item.type === "VISIT_COMPLETED" ? "records" : "bell"} />
                </span>
                <div className={styles.content}>
                  <div className={styles.itemHeading}>
                    <h3>{item.title}</h3>
                    {!read && <span className={styles.unreadDot} aria-label="Chưa đọc" />}
                  </div>
                  <p>{item.message}</p>
                  <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
                  <div className={styles.itemActions}>
                    {item.visitId && (
                      <Link
                        href={patientRecordLink(item.visitId)}
                        onClick={() => {
                          if (!read) void markRead(item);
                          onOpenChange(false);
                        }}
                      >
                        {item.type === "VISIT_COMPLETED"
                          ? "Xem kết luận & Đơn thuốc"
                          : "Xem lượt khám liên quan"}
                      </Link>
                    )}
                    {!read && (
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => void markRead(item)}
                        aria-label={`Đánh dấu đã đọc: ${item.title}`}
                      >
                        {busy === item.id ? "Đang đánh dấu…" : "Đánh dấu đã đọc"}
                      </button>
                    )}
                    {read && <span className={styles.readLabel}>Đã đọc</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            feed.error
              ? "Chưa tải được danh sách thông báo"
              : filter === "unread"
                ? "Bạn đã đọc hết thông báo"
                : filter === "read"
                  ? "Chưa có thông báo đã đọc"
                  : "Chưa có thông báo"
          }
        />
      )}
      {!feed.loading && feed.error && (
        <div className={styles.feedFooter} role="alert">
          <p>{feed.error}</p>
          <Button onClick={feed.loadMore}>Thử lại tải thông báo</Button>
        </div>
      )}
      {!feed.loading && !feed.error && feed.hasMore && (
        <div ref={sentinel} className={styles.feedFooter} aria-live="polite">
          {feed.loadingMore ? (
            <>
              <Spin size="small" />
              <span>Đang tải thêm thông báo…</span>
            </>
          ) : (
            <button type="button" onClick={feed.loadMore}>
              Tải thêm thông báo
            </button>
          )}
        </div>
      )}
      {!feed.loading && !feed.error && !feed.hasMore && visible.length > 0 && (
        <p className={styles.endMessage}>Đã hiển thị hết thông báo</p>
      )}
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      classNames={{ root: styles.popup }}
      styles={{ container: { padding: 0 } }}
      afterOpenChange={(visible) => {
        setPopupReady(visible);
        if (visible) panel.current?.focus();
      }}
      content={
        <section
          className={styles.panel}
          id="patient-notifications-popup"
          role="dialog"
          aria-label="Thông báo bệnh nhân"
          tabIndex={-1}
          ref={panel}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
        >
          <div className={styles.heading}>
            <div>
              <h2>Thông báo</h2>
              <p role="status" aria-live="polite">
                {notifications.loading
                  ? "Đang tải…"
                  : !countsAvailable
                    ? "Chưa xác định số thông báo chưa đọc"
                    : `${unreadCount} chưa đọc · ${notifications.data!.total} thông báo`}
              </p>
            </div>
            <button
              className={styles.close}
              type="button"
              aria-label="Đóng thông báo"
              onClick={close}
            >
              ×
            </button>
          </div>
          <div className={styles.toolbar}>
            <button
              type="button"
              disabled={!!busy || !countsAvailable || unreadCount === 0}
              onClick={() => void markRead()}
            >
              {busy === "all" ? "Đang đánh dấu…" : "Đánh dấu tất cả đã đọc"}
            </button>
          </div>
          {readError && (
            <Alert
              type="error"
              showIcon
              title="Chưa đánh dấu được thông báo"
              description={readError}
            />
          )}
          {countFailure && (
            <div className={styles.countWarning} role="alert">
              <p>Chưa tải được số lượng thông báo. Bạn vẫn có thể đọc từng thông báo.</p>
              <PatientRefreshButton onRefresh={notifications.refresh}>Thử lại</PatientRefreshButton>
            </div>
          )}
          <Tabs
            activeKey={filter}
            onChange={(key) => {
              setFilter(key as Filter);
              scrollRoot.current?.scrollTo({ top: 0 });
            }}
            items={[
              { disabled: !!busy, key: "all", label: "Tất cả", children: list },
              { disabled: !!busy, key: "unread", label: "Chưa đọc", children: list },
              { disabled: !!busy, key: "read", label: "Đã đọc", children: list },
            ]}
            destroyOnHidden
          />
        </section>
      }
    >
      <button
        ref={trigger}
        className={styles.trigger}
        type="button"
        aria-label="Thông báo"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? "patient-notifications-popup" : undefined}
      >
        <PatientIcon name="bell" />
        {countFailure && (
          <span
            className={`${styles.count} ${styles.unknownCount}`}
            aria-label="Chưa xác định số thông báo chưa đọc"
          >
            ?
          </span>
        )}
        {countsAvailable && unreadCount != null && unreadCount > 0 && (
          <span className={styles.count} aria-label={`${unreadCount} thông báo chưa đọc`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </Popover>
  );
}
