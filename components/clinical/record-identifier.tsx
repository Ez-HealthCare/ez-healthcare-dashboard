"use client";

import { Typography } from "antd";
import { shortIdentifier } from "@/lib/display-format";

export function RecordIdentifier({ label, value }: { label?: string; value?: string | null }) {
  return (
    <details className="record-identifier">
      <summary title={value || undefined}>
        {label ? `${label}: ` : ""}
        {shortIdentifier(value)}
      </summary>
      <Typography.Text
        copyable={value ? { text: value, tooltips: ["Sao chép mã đầy đủ", "Đã sao chép"] } : false}
      >
        {value || "—"}
      </Typography.Text>
    </details>
  );
}
