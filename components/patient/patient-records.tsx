"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Alert, Button, Empty, Pagination, Skeleton } from "antd";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { formatDateTime } from "@/lib/display-format";
import { visitStatusLabel } from "@/lib/visit-status";
import { ROUTES } from "@/lib/constants/routes";
import { PatientIcon } from "./patient-icon";
import styles from "./patient-records.module.css";
import { ReadOnlyVisitRecord } from "../clinical/read-only-visit-record";

export function PatientRecords({ completedOnly }: { completedOnly: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const visitId = params.get("visitId");
  const requestedPage = Number(params.get("page") || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const base = `${ROUTES.PATIENT}/${completedOnly ? "records" : "visits"}`;
  const backHref = base + (page > 1 ? `?page=${page}` : "");
  const label = completedOnly ? "Hồ sơ khám bệnh" : "Lượt khám của tôi";
  if (visitId) {
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(visitId)) {
      return (
        <Alert
          type="error"
          showIcon
          title="Mã lượt khám không hợp lệ"
          description={<Link href={backHref}>Về {label.toLocaleLowerCase("vi-VN")}</Link>}
        />
      );
    }
    return (
      <ReadOnlyVisitRecord
        key={visitId}
        visitId={visitId}
        load={clinicalActions.visitDossier}
        backHref={backHref}
        backLabel={label}
        patientView
      />
    );
  }
  return (
    <PatientHistoryList
      key={`${completedOnly}-${page}`}
      completedOnly={completedOnly}
      page={page}
      base={base}
      onPage={(value) => router.push(base + (value > 1 ? `?page=${value}` : ""), { scroll: false })}
    />
  );
}

function PatientHistoryList({
  completedOnly,
  page,
  base,
  onPage,
}: {
  completedOnly: boolean;
  page: number;
  base: string;
  onPage: (page: number) => void;
}) {
  const history = useClinicalData(() => clinicalActions.patientHistory(page, completedOnly), 8_000);
  const total = history.data?.total;
  const outOfRange = !!total && page > Math.ceil(total / 10);
  return (
    <section
      className={styles.section}
      aria-label={completedOnly ? "Hồ sơ khám bệnh" : "Lượt khám của tôi"}
    >
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>
            Cổng người bệnh · {completedOnly ? "Sau khám" : "Theo dõi lượt khám"}
          </span>
          <h1>{completedOnly ? "Hồ sơ khám bệnh" : "Lượt khám của tôi"}</h1>
          <p>
            {completedOnly
              ? "Kết luận, đơn thuốc và lời dặn được lưu sau mỗi lượt khám hoàn tất."
              : "Theo dõi trạng thái từ tiếp nhận đến hoàn tất và xem lại từng lượt khám."}
          </p>
        </div>
        <Button onClick={() => void history.refresh()}>Làm mới</Button>
      </div>
      <div className={styles.contextBar}>
        <span className={styles.contextIcon}>
          <PatientIcon name={completedOnly ? "records" : "ticket"} />
        </span>
        <div>
          <strong>
            {completedOnly ? "Hồ sơ của các lượt đã hoàn tất" : "Tất cả lượt khám của bạn"}
          </strong>
          <p>
            {completedOnly
              ? "Mở từng hồ sơ để xem kết luận, đơn thuốc và lịch hẹn tái khám."
              : "Lượt đang khám, hoàn tất, tạm vắng và đã hủy được phân biệt bằng nhãn trạng thái."}
          </p>
        </div>
        <span className={styles.total}>
          {total == null ? "—" : total} <small>{completedOnly ? "hồ sơ" : "lượt khám"}</small>
        </span>
      </div>
      {history.error && (
        <Alert
          type="error"
          showIcon
          title="Không tải được lịch sử khám"
          description={history.error}
          action={<Button onClick={() => void history.refresh()}>Thử lại</Button>}
        />
      )}
      {history.loading ? (
        <div className={styles.loading}>
          <Skeleton active />
          <Skeleton active />
        </div>
      ) : !history.data?.items.length && !history.error ? (
        <div className={styles.empty}>
          <Empty
            description={
              outOfRange
                ? "Không có lượt khám ở trang này"
                : completedOnly
                  ? "Chưa có hồ sơ khám đã hoàn tất"
                  : "Bạn chưa có lượt khám"
            }
          />
          {outOfRange ? (
            <Button onClick={() => onPage(1)}>Về trang đầu</Button>
          ) : (
            <Link href={ROUTES.PATIENT}>Về trang chủ bệnh nhân →</Link>
          )}
        </div>
      ) : null}
      <div className={styles.list}>
        {history.data?.items.map((item) => (
          <article key={item.visitId} className={styles.visitCard}>
            <span className={styles.visitIcon}>
              <PatientIcon name={completedOnly ? "records" : "ticket"} />
            </span>
            <div className={styles.visitBody}>
              <div className={styles.visitHeading}>
                <div>
                  <span className={styles.eyebrow}>
                    {item.clinicTicketNumber ? "Số khám" : "Số tiếp nhận"}
                  </span>
                  <h2>{item.clinicTicketNumber || item.hallTicketNumber}</h2>
                </div>
                <span
                  className={styles.status}
                  data-tone={
                    item.status === "COMPLETED"
                      ? "done"
                      : item.status === "CANCELLED" || item.status === "EMERGENCY_DISPATCHED"
                        ? "stopped"
                        : item.status === "TEMPORARILY_ABSENT"
                          ? "warning"
                          : "active"
                  }
                >
                  {visitStatusLabel(item.status)}
                </span>
              </div>
              <p className={styles.reason}>
                {item.conclusion?.icd10Name || item.chiefComplaint || "Chưa ghi nhận lý do khám"}
              </p>
              <div className={styles.metadata}>
                <span>
                  <PatientIcon name="building" />
                  {item.room ? `${item.room.code} · ${item.room.name}` : "Chưa phân phòng"}
                </span>
                <span>
                  <PatientIcon name="user" />
                  {item.doctor?.name || "Chưa có bác sĩ tiếp nhận"}
                </span>
              </div>
              <div className={styles.visitFooter}>
                <time dateTime={item.createdAt}>
                  <PatientIcon name="calendar" />
                  {formatDateTime(item.createdAt)}
                </time>
                <Link
                  className={styles.openLink}
                  href={`${base}?visitId=${encodeURIComponent(item.visitId)}${page > 1 ? `&page=${page}` : ""}`}
                >
                  {item.status === "COMPLETED" ? "Xem kết luận & Đơn thuốc →" : "Xem lượt khám →"}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!!total && !outOfRange && (
        <div className={styles.pagination}>
          <span>
            Trang {page} / {Math.max(1, Math.ceil(total / 10))}
          </span>
          <Pagination
            current={page}
            pageSize={10}
            total={total}
            onChange={onPage}
            showSizeChanger={false}
            responsive
            aria-label="Phân trang lịch sử khám"
          />
        </div>
      )}
    </section>
  );
}
