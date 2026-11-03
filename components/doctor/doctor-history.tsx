"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Empty, Input, Pagination, Skeleton, Tag } from "antd";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { formatDate, formatDateTime } from "@/lib/display-format";
import { ReadOnlyVisitRecord } from "@/components/clinical/read-only-visit-record";
import styles from "./doctor-history.module.css";

const base = "/dashboard/doctor/history";

export function DoctorHistory() {
  const params = useSearchParams();
  const visitId = params.get("visitId");
  const filters = new URLSearchParams(params.toString());
  filters.delete("visitId");
  const backHref = base + (filters.size ? `?${filters}` : "");
  if (visitId) {
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(visitId))
      return (
        <Alert
          type="error"
          showIcon
          title="Mã lượt khám không hợp lệ"
          action={<Button href={backHref}>Về lịch sử khám bệnh</Button>}
        />
      );
    return (
      <ReadOnlyVisitRecord
        key={visitId}
        visitId={visitId}
        load={clinicalActions.doctorHistoryDetail}
        backHref={backHref}
        backLabel="Lịch sử khám bệnh"
      />
    );
  }
  const rawPage = params.get("page") || "1";
  const page = /^[1-9]\d*$/.test(rawPage) ? Math.min(Number(rawPage), 1_000_000) : 1;
  return (
    <DoctorHistoryList
      key={params.toString()}
      page={page}
      initialDate={params.get("completedDate") || ""}
      initialSearch={params.get("search") || ""}
    />
  );
}

function DoctorHistoryList({
  page,
  initialDate,
  initialSearch,
}: {
  page: number;
  initialDate: string;
  initialSearch: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [search, setSearch] = useState(initialSearch);
  const history = useClinicalData(
    () =>
      clinicalActions.doctorHistory({
        page,
        completedDate: initialDate || undefined,
        search: initialSearch || undefined,
      }),
    30_000
  );
  const href = (targetPage: number, value = initialSearch, day = initialDate) => {
    const query = new URLSearchParams();
    if (day) query.set("completedDate", day);
    if (value.trim()) query.set("search", value.trim());
    if (targetPage !== 1) query.set("page", String(targetPage));
    return base + (query.size ? `?${query}` : "");
  };
  const detailHref = (visitId: string) => {
    const url = href(page);
    return url + (url.includes("?") ? "&" : "?") + "visitId=" + encodeURIComponent(visitId);
  };
  return (
    <section className={styles.page} aria-label="Lịch sử khám bệnh của bác sĩ">
      <div className={styles.heading}>
        <div>
          <h1>Lịch sử khám bệnh</h1>
          <p>Các lượt đã hoàn tất do bạn phụ trách. Kết luận và đơn thuốc chỉ được xem lại.</p>
        </div>
        <Button onClick={() => void history.refresh()}>Làm mới lịch sử</Button>
      </div>
      <form
        className={styles.filters}
        onSubmit={(event) => {
          event.preventDefault();
          router.push(href(1, search, date));
        }}
      >
        <label>
          <span>Ngày hoàn tất</span>
          <Input
            type="date"
            aria-label="Ngày hoàn tất"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <small>{date ? `${formatDate(date)} · Giờ Việt Nam` : "Tất cả ngày"}</small>
        </label>
        <label>
          <span>Tìm người bệnh / Số khám</span>
          <Input
            aria-label="Tìm trong lịch sử khám"
            placeholder="Họ tên, số khám hoặc số tiếp nhận"
            maxLength={100}
            allowClear
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className={styles.filterActions}>
          <Button type="primary" htmlType="submit">
            Áp dụng
          </Button>
          <Button onClick={() => router.push(base)}>Xóa bộ lọc</Button>
        </div>
      </form>
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
        <Skeleton active />
      ) : !history.error && !history.data?.items.length ? (
        <Empty description="Không có lượt khám đã hoàn tất phù hợp" />
      ) : null}
      {history.data && <p className={styles.count}>{history.data.total} lượt khám phù hợp</p>}
      <div className={styles.list}>
        {history.data?.items.map((item) => (
          <article className={styles.card} key={item.visitId}>
            <div className={styles.heading}>
              <div>
                <h2>{item.patientName}</h2>
                <p className={styles.ticket}>{item.clinicTicketNumber || item.hallTicketNumber}</p>
              </div>
              <Tag color="green">Đã hoàn tất khám</Tag>
            </div>
            <p>
              <strong>{item.icd10Code}</strong> · {item.icd10Name}
            </p>
            <div className={styles.metadata}>
              <span>
                Hoàn tất:{" "}
                <time dateTime={item.completedAt}>{formatDateTime(item.completedAt)}</time>
              </span>
              <span>
                {item.room ? `${item.room.code} · ${item.room.name}` : "Chưa ghi nhận phòng"}
              </span>
            </div>
            <Link href={detailHref(item.visitId)} className={styles.detailLink}>
              Xem kết luận & Đơn thuốc →
            </Link>
          </article>
        ))}
      </div>
      {!!history.data?.total && (
        <Pagination
          current={page}
          pageSize={10}
          total={history.data.total}
          onChange={(next) => router.push(href(next))}
          responsive
          showSizeChanger={false}
          aria-label="Phân trang lịch sử khám bác sĩ"
        />
      )}
    </section>
  );
}
