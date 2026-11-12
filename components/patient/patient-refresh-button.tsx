"use client";

import { useRef, useState } from "react";
import { Button } from "antd";
import styles from "./patient-refresh-button.module.css";

export function PatientRefreshButton({
  onRefresh,
  children = "Làm mới",
}: {
  onRefresh: () => Promise<void>;
  children?: React.ReactNode;
}) {
  const lock = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  return (
    <Button
      className={styles.button}
      loading={refreshing}
      aria-busy={refreshing}
      onClick={async () => {
        if (lock.current) return;
        lock.current = true;
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          lock.current = false;
          setRefreshing(false);
        }
      }}
      icon={
        !refreshing ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 7v5h-5M4 17v-5h5M6.1 6.1A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 5.9" />
          </svg>
        ) : undefined
      }
    >
      {children}
    </Button>
  );
}
