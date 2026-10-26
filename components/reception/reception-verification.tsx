"use client";

import { Button, Checkbox, Input, message } from "antd";
import { useState } from "react";
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
  const [loading, setLoading] = useState(false);
  const [toast, context] = message.useMessage();
  const canVerify = visit.status === "HALL_WAITING" && visit.ticketStatus === "CALLED";

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      setLoading(true);
      await action();
      toast.success(success);
      await onComplete();
    } catch (error) {
      toast.error(clinicalErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.panel}>
      {context}
      <div className={styles.header}>
        <div>
          <span className={styles.kicker}>Phiếu tiếp nhận & xác minh</span>
          <h4>Đối soát hồ sơ hành chính</h4>
        </div>
        <span className={styles.ticket}>{visit.hallTicketNumber}</span>
      </div>

      <div className={styles.patient}>
        <strong>{visit.patient.name}</strong>
        <span>Ngày sinh: {visit.patient.dateOfBirth || "Chưa cập nhật"}</span>
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
