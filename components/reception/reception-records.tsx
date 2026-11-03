"use client";

import { businessDateInput, formatDate, formatDateTime } from "@/lib/display-format";
import { RecordIdentifier } from "@/components/clinical/record-identifier";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Select,
  Table,
  Tag,
  Timeline,
} from "antd";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { RECEPTION_STATUS } from "@/lib/constants/reception";
import type { ReceptionRecord } from "@/lib/types/reception";
import styles from "./reception-records.module.css";

const ticketLabels: Record<string, string> = {
  ACTIVE: "Đang chờ",
  CALLED: "Đã gọi",
  PAUSED: "Tạm dừng",
  COMPLETED: "Đã xử lý",
  EXPIRED: "Hết hạn",
  SUPERSEDED: "Đã thay thế",
};
const time = formatDateTime;
const today = businessDateInput;

export function ReceptionRecords() {
  const params = useSearchParams();
  return (
    <ReceptionRecordsView key={params.toString()} initialSearch={params.get("search") || ""} />
  );
}

function ReceptionRecordsView({ initialSearch }: { initialSearch: string }) {
  const [date, setDate] = useState(() => today());
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<string>();
  const [page, setPage] = useState(1);
  return (
    <section className={styles.workspace}>
      <div className={styles.breadcrumb}>
        Khu tiếp đón trung tâm › <strong>Tra cứu hồ sơ</strong>
      </div>
      <div className={styles.heading}>
        <h1>Tra cứu hồ sơ bệnh nhân</h1>
        <p>
          Toàn bộ lượt có số tiếp nhận hoặc số khám trong ngày đã chọn, kể cả đã bàn giao, hoàn tất,
          tạm vắng hoặc hủy.
        </p>
      </div>
      {initialSearch && (
        <Alert
          type="info"
          showIcon
          title="Đang tra cứu lượt từ thông báo"
          description="Danh sách lọc theo ngày tiếp nhận đang chọn. Nếu không có kết quả, hãy chọn ngày của lượt cần tìm."
        />
      )}
      <div className={styles.card}>
        <div className={styles.filters}>
          <label>
            Ngày tiếp nhận
            <Input
              aria-label="Ngày tiếp nhận"
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) {
                  setDate(e.target.value);
                  setPage(1);
                }
              }}
            />
            <small>{formatDate(date)}</small>
          </label>
          <label>
            Trạng thái lượt khám
            <Select
              aria-label="Trạng thái lượt khám"
              value={status}
              allowClear
              placeholder="Tất cả trạng thái"
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={Object.entries(RECEPTION_STATUS).map(([value, label]) => ({ value, label }))}
            />
          </label>
          <label className={styles.search}>
            Tìm hồ sơ
            <Input.Search
              defaultValue={initialSearch}
              aria-label="Tìm hồ sơ trong ngày"
              placeholder="Tên, mã BN/lượt, CCCD, BHYT hoặc số tiếp nhận/khám"
              allowClear
              onSearch={(value) => {
                setSearch(value.trim());
                setPage(1);
              }}
              enterButton="Tìm kiếm"
            />
          </label>
        </div>
      </div>
      <RecordList
        key={`${date}|${search}|${status || ""}|${page}`}
        criteria={{ businessDate: date, search: search || undefined, status, page, pageSize: 20 }}
        onPage={setPage}
      />
    </section>
  );
}

function RecordList({
  criteria,
  onPage,
}: {
  criteria: Parameters<typeof clinicalActions.receptionRecords>[0];
  onPage: (page: number) => void;
}) {
  const records = useClinicalData(() => clinicalActions.receptionRecords(criteria), 15_000);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = records.data?.items.find((item) => item.visitId === selectedId);
  return (
    <>
      <div className={styles.card}>
        <div className={styles.listHeading}>
          <div>
            <h2>Danh sách lượt khám</h2>
            <p>
              {records.data
                ? `${records.data.total} lượt phù hợp · Mỗi lượt hiển thị một dòng`
                : "Đang tải hồ sơ…"}
            </p>
          </div>
          <Button loading={records.loading} onClick={() => void records.refresh()}>
            ↻ Làm mới
          </Button>
        </div>
        {records.error ? (
          <Alert
            type="error"
            showIcon
            title="Không tải được danh sách hồ sơ"
            description={records.error}
            action={<Button onClick={() => void records.refresh()}>Thử lại</Button>}
          />
        ) : (
          <Table<ReceptionRecord>
            rowKey="visitId"
            loading={records.loading}
            dataSource={records.data?.items || []}
            scroll={{ x: 1120 }}
            locale={{
              emptyText: (
                <Empty description="Không có lượt khám phù hợp với ngày và bộ lọc đã chọn" />
              ),
            }}
            pagination={{
              current: criteria.page,
              pageSize: 20,
              total: records.data?.total || 0,
              showSizeChanger: false,
              onChange: onPage,
            }}
            columns={[
              {
                title: "Số tiếp nhận / khám",
                key: "ticket",
                width: 155,
                render: (_, r) => (
                  <>
                    <strong>{r.hallTicketNumber}</strong>
                    <div className={styles.muted}>{r.clinicTicketNumber || "Chưa cấp số khám"}</div>
                  </>
                ),
              },
              {
                title: "Người bệnh",
                key: "patient",
                width: 210,
                render: (_, r) => (
                  <>
                    <strong>{r.patient.name}</strong>
                    <div className={styles.muted}>CCCD: {r.patient.nationalId || "—"}</div>
                    {r.isPriority && <Tag color="gold">Ưu tiên</Tag>}
                  </>
                ),
              },
              {
                title: "Trạng thái",
                key: "status",
                width: 180,
                render: (_, r) => (
                  <>
                    <Tag
                      color={
                        r.status === "COMPLETED"
                          ? "green"
                          : r.status === "CANCELLED"
                            ? "red"
                            : "cyan"
                      }
                    >
                      {RECEPTION_STATUS[r.status]}
                    </Tag>
                    {r.status === "HALL_WAITING" && (
                      <div className={styles.muted}>{ticketLabels[r.ticketStatus || ""] || ""}</div>
                    )}
                  </>
                ),
              },
              {
                title: "Phòng hiện tại",
                key: "room",
                width: 190,
                render: (_, r) => (r.room ? `${r.room.code} · ${r.room.name}` : "Chưa phân phòng"),
              },
              { title: "Cập nhật gần nhất", dataIndex: "updatedAt", width: 155, render: time },
              {
                title: "Thao tác",
                key: "action",
                width: 115,
                render: (_, r) => (
                  <Button onClick={() => setSelectedId(r.visitId)}>Xem chi tiết</Button>
                ),
              },
            ]}
          />
        )}
      </div>
      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(undefined)}
        title="Chi tiết lượt tiếp nhận"
        size="large"
      >
        {selected && (
          <div className={styles.detail}>
            <Alert
              type="info"
              title="Tra cứu thông tin"
              description="Trang này chỉ đọc hồ sơ. Gọi bệnh nhân và xác minh tại Bàn tiếp nhận hoặc Hàng đợi."
            />
            <Descriptions
              column={1}
              bordered
              size="small"
              items={[
                { key: "name", label: "Người bệnh", children: selected.patient.name },
                { key: "patient", label: "Mã bệnh nhân", children: selected.patient.id },
                {
                  key: "visit",
                  label: "Mã lượt khám",
                  children: <RecordIdentifier value={selected.visitId} />,
                },
                { key: "nationalId", label: "CCCD", children: selected.patient.nationalId || "—" },
                {
                  key: "insurance",
                  label: "BHYT",
                  children: selected.patient.insuranceCardNumber || "—",
                },
                {
                  key: "dateOfBirth",
                  label: "Ngày sinh",
                  children: selected.patient.dateOfBirth
                    ? formatDate(selected.patient.dateOfBirth)
                    : "—",
                },
                {
                  key: "status",
                  label: "Trạng thái hiện tại",
                  children: RECEPTION_STATUS[selected.status],
                },
                {
                  key: "verified",
                  label: "Xác minh tại quầy",
                  children: selected.isVerified ? "Đã xác minh" : "Chưa xác minh",
                },
                {
                  key: "intake",
                  label: "Ghi nhận sàng lọc",
                  children: selected.intakeCompleted ? "Đã ghi nhận" : "Chưa ghi nhận",
                },
                {
                  key: "room",
                  label: "Phòng hiện tại",
                  children: selected.room
                    ? `${selected.room.code} · ${selected.room.name}`
                    : "Chưa phân phòng",
                },
                {
                  key: "reason",
                  label: "Lý do khám",
                  children: selected.chiefComplaint || "Chưa ghi nhận",
                },
                { key: "created", label: "Tạo lượt", children: time(selected.createdAt) },
                { key: "updated", label: "Cập nhật gần nhất", children: time(selected.updatedAt) },
              ]}
            />
            <h3>Lịch sử cấp số và gọi bệnh nhân</h3>
            <p className={styles.muted}>Mới nhất trước · Bao gồm số đã thay thế khi cấp lại.</p>
            <Timeline
              items={selected.ticketHistory.map((ticket) => ({
                key: ticket.id,
                content: (
                  <div>
                    <strong>
                      {ticket.number} · {ticket.kind === "HALL" ? "Tiếp nhận" : "Phòng khám"}
                    </strong>
                    <p>
                      {ticketLabels[ticket.status] || ticket.status} · Ngày {ticket.businessDate}
                    </p>
                    <p>Cấp số: {time(ticket.createdAt)}</p>
                    <p>
                      Đã gọi {ticket.callAttempts} lần · Gọi gần nhất: {time(ticket.lastCalledAt)}
                    </p>
                    {ticket.reissueReason && <p>Lý do cấp lại: {ticket.reissueReason}</p>}
                  </div>
                ),
              }))}
            />
          </div>
        )}
      </Drawer>
    </>
  );
}
