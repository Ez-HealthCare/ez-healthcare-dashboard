"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Alert, Button, Empty, Pagination, Skeleton, Tag } from "antd";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { formatDateTime } from "@/lib/display-format";
import { patientRecordLink, visitStatusLabel } from "@/lib/visit-status";
import styles from "../clinical/visit-record.module.css";
import { ReadOnlyVisitRecord } from "../clinical/read-only-visit-record";

export function PatientRecords({ completedOnly }: { completedOnly: boolean }) {
  const visitId = useSearchParams().get("visitId");
  const [page, setPage] = useState(1);
  if (visitId) {
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(visitId)) {
      return (
        <Alert
          type="error"
          showIcon
          title="Mã lượt khám không hợp lệ"
          description={<Link href="/dashboard/patient/records">Về hồ sơ khám bệnh</Link>}
        />
      );
    }
    return (
      <ReadOnlyVisitRecord
        key={visitId}
        visitId={visitId}
        load={clinicalActions.visitDossier}
        backHref="/dashboard/patient/records"
        backLabel="Hồ sơ khám bệnh"
      />
    );
  }
  return (
    <PatientHistoryList
      key={`${completedOnly}-${page}`}
      completedOnly={completedOnly}
      page={page}
      onPage={setPage}
    />
  );
}

function PatientHistoryList({
  completedOnly,
  page,
  onPage,
}: {
  completedOnly: boolean;
  page: number;
  onPage: (page: number) => void;
}) {
  const history = useClinicalData(() => clinicalActions.patientHistory(page, completedOnly), 8_000);
  return (
    <section
      className={styles.section}
      aria-label={completedOnly ? "Hồ sơ khám bệnh" : "Lượt khám của tôi"}
    >
      <div className={styles.heading}>
        <div>
          <h1>{completedOnly ? "Hồ sơ khám bệnh" : "Lượt khám của tôi"}</h1>
          <p>
            {completedOnly
              ? "Kết luận, đơn thuốc và lời dặn của các lượt khám đã hoàn tất."
              : "Theo dõi trạng thái và xem lại thông tin các lượt khám của bạn."}
          </p>
        </div>
        <Button onClick={() => void history.refresh()}>Làm mới</Button>
      </div>
      {history.error ? (
        <Alert
          type="error"
          showIcon
          title="Không tải được lịch sử khám"
          description={history.error}
          action={<Button onClick={() => void history.refresh()}>Thử lại</Button>}
        />
      ) : null}
      {history.loading ? (
        <Skeleton active />
      ) : !history.data?.items.length && !history.error ? (
        <Empty
          description={completedOnly ? "Chưa có hồ sơ khám đã hoàn tất" : "Bạn chưa có lượt khám"}
        />
      ) : null}
      <div className={styles.list}>
        {history.data?.items.map((item) => (
          <article key={item.visitId} className={styles.card}>
            <div className={styles.heading}>
              <div>
                <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
                <h3>{item.clinicTicketNumber || item.hallTicketNumber}</h3>
              </div>
              <Tag color={item.status === "COMPLETED" ? "green" : "blue"}>
                {visitStatusLabel(item.status)}
              </Tag>
            </div>
            <p>{item.conclusion?.icd10Name || item.chiefComplaint || "Chưa ghi nhận lý do khám"}</p>
            <p className={styles.muted}>
              {item.room ? `${item.room.code} · ${item.room.name}` : "Chưa phân phòng"}
              {item.doctor ? ` · ${item.doctor.name}` : ""}
            </p>
            <Link className={styles.openLink} href={patientRecordLink(item.visitId)}>
              {item.status === "COMPLETED" ? "Xem kết luận & Đơn thuốc →" : "Xem lượt khám →"}
            </Link>
          </article>
        ))}
      </div>
      {!!history.data?.total && (
        <Pagination
          current={page}
          pageSize={10}
          total={history.data.total}
          onChange={onPage}
          showSizeChanger={false}
          responsive
          aria-label="Phân trang lịch sử khám"
        />
      )}
    </section>
  );
}
