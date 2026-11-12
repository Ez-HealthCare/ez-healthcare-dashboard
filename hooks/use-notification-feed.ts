"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clinicalActions } from "./use-clinical";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import type { NotificationFilter, NotificationItem } from "@/lib/types/clinical";

type Session = {
  filter: NotificationFilter;
  cursor: string | null;
  loading: boolean;
  started: boolean;
  controller?: AbortController;
};

export function useNotificationFeed(open: boolean, filter: NotificationFilter) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const current = useRef<Session | null>(null);

  const load = useCallback(async (session: Session) => {
    if (current.current !== session || session.loading) return;
    if (session.started && !session.cursor) return;
    session.loading = true;
    const append = session.started;
    const controller = new AbortController();
    session.controller = controller;
    setError("");
    if (append) setLoadingMore(true);
    else {
      setItems([]);
      setHasMore(false);
      setLoading(true);
    }
    try {
      const page = await clinicalActions.notificationPage(
        { filter: session.filter, cursor: session.cursor || undefined, limit: 10 },
        controller.signal
      );
      if (current.current !== session || controller.signal.aborted) return;
      session.cursor = page.nextCursor;
      session.started = true;
      setHasMore(!!page.nextCursor);
      setItems((previous) => {
        const merged = append ? [...previous, ...page.items] : page.items;
        return [...new Map(merged.map((item) => [item.id, item])).values()];
      });
    } catch (failure) {
      if (current.current === session && !controller.signal.aborted)
        setError(clinicalErrorMessage(failure));
    } finally {
      if (current.current === session) {
        session.loading = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const session: Session = { filter, cursor: null, loading: false, started: false };
    current.current = session;
    queueMicrotask(() => {
      if (current.current === session) void load(session);
    });
    return () => {
      current.current?.controller?.abort();
      current.current = null;
    };
  }, [open, filter, load]);

  const loadMore = useCallback(() => {
    if (current.current) void load(current.current);
  }, [load]);

  const acknowledge = useCallback(
    (id?: string) => {
      // Invalidate any page requested before this confirmed mutation. Preserve the
      // last committed cursor and scroll position rather than resetting the feed.
      const session = current.current;
      if (!session) return;
      session.controller?.abort();
      const next = { ...session, loading: false, controller: undefined };
      if (!id && next.filter === "unread") next.cursor = null;
      current.current = next;
      setLoading(false);
      setLoadingMore(false);
      setError("");
      setHasMore(!!next.cursor);
      setItems((previous) =>
        previous
          .map((item) =>
            !id || item.id === id
              ? { ...item, readAt: item.readAt || new Date().toISOString() }
              : item
          )
          .filter((item) => next.filter !== "unread" || !item.readAt)
      );
      if (!next.started) void load(next);
    },
    [load]
  );

  return { items, loading, loadingMore, hasMore, error, loadMore, acknowledge };
}
