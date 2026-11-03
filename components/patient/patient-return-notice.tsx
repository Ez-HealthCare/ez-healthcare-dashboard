"use client";

import { useRef, useState } from "react";
import { Alert, Button } from "antd";
import { clinicalActions } from "@/hooks/use-clinical";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import type { CurrentVisit } from "@/lib/types/clinical";

export function PatientReturnNotice({
  visit,
  onRefresh,
}: {
  visit: CurrentVisit;
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [sentAt, setSentAt] = useState<string>();
  const [error, setError] = useState("");
  const lock = useRef(false);
  const reported = visit.returnReportedAt || sentAt;
  if (visit.status !== "TEMPORARILY_ABSENT" || visit.ticketStatus === "EXPIRED") return null;
  const report = async () => {
    if (lock.current || reported) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await clinicalActions.reportReturn(visit.visitId);
      setSentAt(result.returnReportedAt);
      await onRefresh();
    } catch (error) {
      setError(clinicalErrorMessage(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
      <Alert
        type={reported ? "success" : "warning"}
        showIcon
        title={reported ? "Đã báo bác sĩ bạn quay lại" : "Bạn đã vắng mặt sau 3 lần gọi"}
        description={
          reported
            ? "Vui lòng chờ trước phòng khám. Bác sĩ sẽ kiểm tra và xác nhận xếp lại lượt; bạn chưa được vào khám ngay."
            : "Nếu đã quay lại trước phòng khám, hãy báo có mặt để bác sĩ biết và xếp lại lượt cho bạn."
        }
      />
      {error && (
        <Alert type="error" showIcon title="Chưa gửi được thông báo quay lại" description={error} />
      )}
      <Button
        type="primary"
        aria-label={reported ? "Đã gửi · Chờ bác sĩ xác nhận" : "Tôi đã quay lại phòng khám"}
        aria-busy={busy}
        loading={busy}
        disabled={!!reported || !visit.canReportReturn}
        onClick={() => void report()}
      >
        {reported ? "Đã gửi · Chờ bác sĩ xác nhận" : "Tôi đã quay lại phòng khám"}
      </Button>
    </div>
  );
}
