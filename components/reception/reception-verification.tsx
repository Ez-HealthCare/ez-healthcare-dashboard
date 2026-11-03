"use client";

import { formatDate } from "@/lib/display-format";

import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { Alert, Button, Checkbox, Input, message } from "antd";
import { useRef, useState } from "react";
import { clinicalActions } from "@/hooks/use-clinical";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import type { ReceptionVisit } from "@/lib/types/clinical";
import styles from "./reception-verification.module.css";

export function ReceptionVerification({
  visit,
  onComplete,
}: {
  visit: ReceptionVisit;
  onComplete: () => Promise<void>;
}) {
  return (
    <ReceptionVerificationForm
      key={`${visit.visitId}-${visit.patient.insuranceCardNumber || ""}`}
      onComplete={onComplete}
      visit={visit}
    />
  );
}

function ReceptionVerificationForm({
  visit,
  onComplete,
}: {
  visit: ReceptionVisit;
  onComplete: () => Promise<void>;
}) {
  const [insuranceCardNumber, setInsuranceCardNumber] = useState(
    visit.patient.insuranceCardNumber || ""
  );
  const [nationalIdVerified, setNationalIdVerified] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const changes = useUnsavedChanges();
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, context] = message.useMessage();
  const canVerify = visit.status === "HALL_WAITING" && visit.ticketStatus === "CALLED";

  const run = async (action: () => Promise<unknown>, success: string) => {
    if (lock.current) return;
    lock.current = true;
    setError("");
    try {
      setLoading(true);
      await action();
      changes.markSaved();
      toast.success(success);
      await onComplete();
    } catch (error) {
      setError(clinicalErrorMessage(error));
    } finally {
      lock.current = false;
      setLoading(false);
    }
  };

  return (
    <div className={styles.panel} onChangeCapture={changes.markDirty}>
      {context}
      {changes.dirty && <p role="status">Thông tin đối chiếu chưa được xác nhận.</p>}
      {error && <Alert type="error" showIcon title="Chưa hoàn tất xác minh" description={error} />}
      <div className={styles.header}>
        <div>
          <span className={styles.kicker}>Phiếu tiếp nhận & xác minh</span>
          <h4>Đối soát hồ sơ hành chính</h4>
        </div>
        <span className={styles.ticket}>{visit.hallTicketNumber}</span>
      </div>

      <div className={styles.patient}>
        <strong>{visit.patient.name}</strong>
        <span>Ngày sinh: {formatDate(visit.patient.dateOfBirth)}</span>
        <span>CCCD: {visit.patient.nationalId || "Chưa có dữ liệu"}</span>
      </div>

      {canVerify ? (
        <>
          <label className={styles.field}>
            <span>Số thẻ BHYT</span>
            <Input
              onChange={(event) => setInsuranceCardNumber(event.target.value)}
              placeholder="Nhập hoặc đối chiếu số thẻ BHYT"
              value={insuranceCardNumber}
            />
          </label>
          <Checkbox
            checked={nationalIdVerified}
            onChange={(event) => setNationalIdVerified(event.target.checked)}
          >
            Đã đối chiếu CCCD với người bệnh và xác nhận thông tin hợp lệ.
          </Checkbox>
          {rejecting ? (
            <label className={styles.field}>
              <span>Lý do từ chối tiếp nhận</span>
              <Input.TextArea
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ví dụ: CCCD không khớp với người đến khám"
                rows={2}
                value={reason}
              />
            </label>
          ) : null}
          {!nationalIdVerified && !rejecting && (
            <p>Đối chiếu và tích xác nhận CCCD trước khi tiếp nhận.</p>
          )}
          {rejecting && !reason.trim() && <p>Nhập lý do để xác nhận từ chối.</p>}
          <div className={styles.actions}>
            {rejecting ? (
              <>
                <Button disabled={loading} onClick={() => setRejecting(false)}>
                  Quay lại
                </Button>
                <Button
                  danger
                  disabled={!reason.trim() || loading}
                  loading={loading}
                  onClick={() =>
                    void run(
                      () => clinicalActions.rejectVerification(visit.visitId, reason),
                      "Đã từ chối tiếp nhận."
                    )
                  }
                >
                  Xác nhận từ chối
                </Button>
              </>
            ) : (
              <>
                <Button danger disabled={loading} onClick={() => setRejecting(true)}>
                  Từ chối
                </Button>
                <Button
                  disabled={!nationalIdVerified || loading}
                  loading={loading}
                  onClick={() =>
                    void run(
                      () => clinicalActions.verify(visit.visitId, insuranceCardNumber || undefined),
                      "Đã xác minh hồ sơ."
                    )
                  }
                  type="primary"
                >
                  Xác nhận tiếp nhận
                </Button>
              </>
            )}
          </div>
        </>
      ) : (
        <p className={styles.done}>
          {visit.status === "HALL_WAITING"
            ? "Gọi số này đến quầy trước khi thực hiện xác minh."
            : `Hồ sơ đã được xử lý. Trạng thái hiện tại: ${visit.status}.`}
        </p>
      )}
    </div>
  );
}
