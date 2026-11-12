"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Alert, Button, Checkbox } from "antd";
import { clinicalActions } from "@/hooks/use-clinical";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import { ROUTES } from "@/lib/constants/routes";
import type { CurrentVisit } from "@/lib/types/clinical";
import styles from "./patient-journey.module.css";

export function PatientStartVisit({
  error,
  requestStatus,
  requestLoading,
  requestError,
  onRefresh,
}: {
  error?: string;
  requestStatus?: string;
  requestLoading?: boolean;
  requestError?: string;
  onRefresh: () => Promise<void>;
}) {
  const [atFacility, setAtFacility] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState("");
  const [issued, setIssued] = useState<CurrentVisit>();
  const lock = useRef(false);
  const idempotencyKey = useRef<string | undefined>(undefined);
  const pending = requestStatus === "RECEPTION_PENDING";
  const unavailable = !!error || !!requestError;
  const issue = async () => {
    if (lock.current || !atFacility || pending || requestLoading || unavailable || issued) return;
    lock.current = true;
    setIssuing(true);
    setIssueError("");
    try {
      idempotencyKey.current ||= crypto.randomUUID();
      const ticket = await clinicalActions.requestHallTicket(idempotencyKey.current);
      setIssued(ticket);
      await onRefresh();
    } catch (error) {
      setIssueError(clinicalErrorMessage(error));
      await onRefresh();
    } finally {
      lock.current = false;
      setIssuing(false);
    }
  };
  return (
    <section className={`${styles.overview} ${styles.empty}`} aria-label="Lượt khám hiện tại">
      <span className={styles.label}>Bắt đầu hành trình khám tại viện</span>
      <h2>
        {issued
          ? "Đã cấp số tiếp nhận"
          : error
            ? "Chưa thể xác định lượt khám"
            : "Bạn chưa có lượt khám hôm nay"}
      </h2>
      {issued ? (
        <>
          <p role="status">
            Số tiếp nhận của bạn: <strong>{issued.hallTicketNumber}</strong>. Vui lòng chờ lễ tân
            gọi để đối chiếu thông tin.
          </p>
          <p>
            Đã cấp số thành công. Nếu thông tin lượt khám chưa xuất hiện, hãy tải lại; không cần lấy
            số lần nữa.
          </p>
          <Button onClick={() => void onRefresh()}>Tải lại lượt khám</Button>
        </>
      ) : (
        <>
          <p>
            Đến cơ sở y tế và lấy số tiếp nhận. Khi được gọi, đến quầy lễ tân đối chiếu thông tin;
            sau đó điều dưỡng sàng lọc và hướng dẫn đến bác sĩ.
          </p>
          <p className={styles.arrivalHint}>
            Chỉ lấy số khi bạn đã có mặt tại viện. Chuẩn bị CCCD hoặc giấy tờ tùy thân và thẻ BHYT
            (nếu có).
          </p>
          {pending ? (
            <Alert
              type="info"
              showIcon
              title="Bạn có yêu cầu tiếp nhận từ luồng cũ"
              description={
                <>
                  Yêu cầu đang chờ xử lý. Vui lòng đến quầy lễ tân để kiểm tra trước khi lấy số,
                  tránh tạo hai lượt tiếp nhận.
                  <Link className={styles.recordLink} href={ROUTES.PATIENT_RECEPTION_REQUEST}>
                    Xem yêu cầu đã gửi
                  </Link>
                </>
              }
            />
          ) : requestLoading ? (
            <p role="status">Đang kiểm tra thông tin tiếp nhận…</p>
          ) : unavailable ? (
            <Alert
              type="warning"
              showIcon
              title="Chưa thể kiểm tra thông tin tiếp nhận"
              description="Vui lòng tải lại để xác định bạn đã có lượt khám hoặc yêu cầu đang xử lý hay chưa."
              action={<Button onClick={() => void onRefresh()}>Thử lại</Button>}
            />
          ) : (
            <>
              {requestStatus === "DRAFT" && (
                <p className={styles.arrivalHint}>
                  Bản khai nháp trước đây vẫn được giữ lại. Bạn không cần gửi yêu cầu chờ duyệt để
                  lấy số tại viện.
                </p>
              )}
              <div className={styles.arrivalConfirmation}>
                <Checkbox
                  checked={atFacility}
                  disabled={issuing}
                  onChange={(event) => setAtFacility(event.target.checked)}
                >
                  Tôi đã có mặt tại cơ sở y tế
                </Checkbox>
              </div>
              {issueError && (
                <Alert
                  type="error"
                  showIcon
                  title="Chưa lấy được số tiếp nhận"
                  description={issueError}
                />
              )}
              <div className={styles.actionRow}>
                <Button
                  type="primary"
                  disabled={!atFacility}
                  loading={issuing}
                  onClick={() => void issue()}
                >
                  Lấy số tiếp nhận
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
