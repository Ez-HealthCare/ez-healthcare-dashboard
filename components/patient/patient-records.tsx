"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Alert, Button, Empty, Pagination, Skeleton } from "antd";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { formatDateTime } from "@/lib/display-format";
import type { VisitStatus } from "@/lib/types/clinical";
import { VISIT_STATUS_LABELS, visitStatusLabel } from "@/lib/visit-status";
import { ROUTES } from "@/lib/constants/routes";
import { PatientRefreshButton } from "./patient-refresh-button";
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
  const requestedStatus = params.get("status");
  const status =
    !completedOnly && requestedStatus && Object.hasOwn(VISIT_STATUS_LABELS, requestedStatus)
      ? (requestedStatus as VisitStatus)
      : undefined;
  const listHref = (nextPage: number, nextStatus: VisitStatus | undefined) => {
    const query = new URLSearchParams();
    if (nextPage > 1) query.set("page", String(nextPage));
    if (nextStatus) query.set("status", nextStatus);
    return base + (query.size ? "?" + query.toString() : "");
  };
  const backHref = listHref(page, status);
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
      key={`${completedOnly}-${page}-${status || "all"}`}
      completedOnly={completedOnly}
      page={page}
      base={backHref}
      status={status}
      onStatus={(value) => router.push(listHref(1, value), { scroll: false })}
      onPage={(value) => router.push(listHref(value, status), { scroll: false })}
    />
  );
}

function PatientHistoryList({
  completedOnly,
  page,
  base,
  onPage,
  status,
  onStatus,
}: {
  completedOnly: boolean;
  page: number;
  base: string;
  onPage: (page: number) => void;
  status?: VisitStatus;
  onStatus: (status?: VisitStatus) => void;
}) {
  const history = useClinicalData(
    () => clinicalActions.patientHistory(page, completedOnly, status),
    8_000
  );
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
        <PatientRefreshButton onRefresh={history.refresh} />
      </div>
      <div className={styles.contextBar}>
        <span className={styles.contextIcon}>
          <PatientIcon name={completedOnly ? "records" : "ticket"} />
        </span>
        <div>
          <strong>
            {completedOnly
              ? "Hồ sơ của các lượt đã hoàn tất"
              : status
                ? `Lượt khám · ${visitStatusLabel(status)}`
                : "Tất cả lượt khám của bạn"}
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
      {!completedOnly && (
        <div className={styles.filters}>
          <label htmlFor="patient-history-status">Trạng thái</label>
          <select
            id="patient-history-status"
            value={status || ""}
            onChange={(event) =>
              onStatus(event.target.value ? (event.target.value as VisitStatus) : undefined)
            }
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(VISIT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {status && <Button onClick={() => onStatus(undefined)}>Xóa bộ lọc</Button>}
          <span>Mới nhất trước</span>
        </div>
      )}
      {history.error && (
        <Alert
          type={history.data ? "warning" : "error"}
          showIcon
          title={history.data ? "Lịch sử chưa được cập nhật" : "Không tải được lịch sử khám"}
          description={
            history.data
              ? "Đang hiển thị dữ liệu đã tải trước đó. Vui lòng thử lại để kiểm tra thông tin mới nhất."
              : "Chưa thể kết nối để tải lịch sử. Vui lòng thử lại sau ít phút."
          }
          action={<PatientRefreshButton onRefresh={history.refresh}>Thử lại</PatientRefreshButton>}
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
                : status
                  ? "Không có lượt khám phù hợp với trạng thái đã chọn"
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
                  href={`${base}${base.includes("?") ? "&" : "?"}visitId=${encodeURIComponent(item.visitId)}`}
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
