"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const guards = new Set<() => boolean>();

/** Call before in-app transitions that can unmount an editable form. */
export function confirmDiscardChanges() {
  return [...guards].every((guard) => guard());
}

export function useUnsavedChanges() {
  const current = useRef(false);
  const [dirty, setDirty] = useState(false);
  const markDirty = useCallback(() => {
    current.current = true;
    setDirty(true);
  }, []);
  const markSaved = useCallback(() => {
    current.current = false;
    setDirty(false);
  }, []);
  const confirmDiscard = useCallback(() => {
    if (!current.current) return true;
    if (
      !window.confirm(
        "Có nội dung chưa lưu. Rời khỏi đây sẽ bỏ nội dung đang nhập. Bạn muốn tiếp tục?"
      )
    )
      return false;
    markSaved();
    return true;
  }, [markSaved]);

  useEffect(() => {
    guards.add(confirmDiscard);
    const unload = (event: BeforeUnloadEvent) => {
      if (!current.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target === "_blank" ||
        link.hasAttribute("download")
      )
        return;
      const target = new URL(link.href, location.href);
      if (target.pathname === location.pathname && target.search === location.search) return;
      if (!confirmDiscard()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    // Chromium's Navigation API can cancel same-document Back/Forward before
    // React unmounts a form. Other browsers retain link and unload protection.
    const navigation = (window as unknown as { navigation?: EventTarget }).navigation;
    const traverse = (event: Event) => {
      if ((event as Event & { navigationType?: string }).navigationType !== "traverse") return;
      if (event.cancelable && !confirmDiscard()) event.preventDefault();
    };
    navigation?.addEventListener("navigate", traverse);
    return () => {
      guards.delete(confirmDiscard);
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
      navigation?.removeEventListener("navigate", traverse);
    };
  }, [confirmDiscard]);

  return { dirty, markDirty, markSaved, confirmDiscard };
}
