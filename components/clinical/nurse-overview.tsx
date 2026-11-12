"use client";

import { formatDate, formatDateTime, shortIdentifier } from "@/lib/display-format";
import { RecordIdentifier } from "./record-identifier";

import { useState } from "react";
import { Button, Empty, Input, Skeleton, Tag } from "antd";
import type { IntakeInput, ReceptionVisit } from "@/lib/types/clinical";
import { NurseIcon } from "./nurse-icon";
import styles from "./nurse-workspace.module.css";

export function PatientIdentity({ visit }: { visit: ReceptionVisit }) {
  const initials = visit.patient.name
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("");
  return (
    <div className={styles.identity}>
      <span className={styles.patientAvatar}>{initials}</span>
      <div>
        <h2>{visit.patient.name}</h2>
        <RecordIdentifier label="Mã BN" value={visit.patient.id} />
        <RecordIdentifier label="Mã lượt" value={visit.visitId} />
        <p>
          {visit.patient.dateOfBirth
            ? `Ngày sinh: ${formatDate(visit.patient.dateOfBirth)}`
            : "Chưa có ngày sinh"}
        </p>
      </div>
      <div className={styles.ticket}>
        <small>Số tiếp nhận</small>
        <strong>{visit.hallTicketNumber}</strong>
        <small>{visit.intakeCompleted ? "Đã sàng lọc" : "Chờ sàng lọc"}</small>
      </div>
    </div>
  );
}

export function VitalSummary({ values }: { values?: Partial<IntakeInput> }) {
  const metrics = [
    [
      "Huyết áp (BP)",
      values?.bloodPressureSystolic != null && values?.bloodPressureDiastolic != null
        ? `${values.bloodPressureSystolic}/${values.bloodPressureDiastolic}`
        : "—",
      "mmHg",
      "43-310-imgContainer2",
    ],
    ["Mạch (Pulse)", values?.heartRate ?? "—", "lần/phút", "43-310-imgContainer3"],
    ["SpO₂", values?.spo2 ?? "—", "%", "43-310-imgContainer4"],
    ["Thân nhiệt", values?.temperature ?? "—", "°C", "43-310-imgContainer5"],
  ];
  return (
    <div className={styles.vitalSummary}>
      {metrics.map(([label, value, unit, icon]) => (
        <div key={label}>
          <div className={styles.cardHeading}>
            <small>{label}</small>
            <NurseIcon name={String(icon)} width={14} />
          </div>
          <strong>{value}</strong>
          <small>{unit}</small>
        </div>
      ))}
    </div>
  );
}

export function NurseOverview({
  section,
  rows,
  loading,
  busy,
  intakes,
  onOpen,
  onAssign,
  onReissue,
  onRefresh,
}: {
  section: string;
  rows: ReceptionVisit[];
  loading: boolean;
  busy: boolean;
  intakes: Record<string, IntakeInput>;
  onOpen: (row: ReceptionVisit) => void;
  onAssign: (row: ReceptionVisit) => void;
  onReissue: (row: ReceptionVisit) => void;
  onRefresh: () => void;
}) {
  const [activeId, setActiveId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const pending = rows.filter(
    (row) => !row.intakeCompleted && row.status !== "EMERGENCY_DISPATCHED"
  );
  const filtered = rows.filter((row) => {
    const matches = `${row.patient.name} ${row.patient.id} ${row.hallTicketNumber}`
      .toLocaleLowerCase("vi-VN")
      .includes(search.toLocaleLowerCase("vi-VN"));
    return (
      matches &&
      (filter === "all" ||
        (filter === "priority"
          ? row.isPriority
          : filter === "done"
            ? row.intakeCompleted
            : !row.intakeCompleted))
    );
  });
  const active = rows.find((row) => row.visitId === activeId) || pending[0] || rows[0];
  const history = section === "history";
  const records = section === "records";
  const queuePage = section === "queue" || records || history;
  const visibleRows = history ? filtered.filter((row) => row.intakeCompleted) : filtered;
  const title = history
    ? "Lịch sử bàn giao"
    : records
      ? "Tra cứu hồ sơ"
      : section === "queue"
        ? "Hàng đợi sàng lọc"
        : "Bàn làm việc sàng lọc - Phòng 102";
  const actions = (row: ReceptionVisit) =>
    row.status === "EMERGENCY_DISPATCHED" ? (
      <Tag color="red">Đã chuyển cấp cứu · Không phân phòng khám thường</Tag>
    ) : (
      <div className={styles.actions}>
        <Button type="primary" loading={busy} onClick={() => onOpen(row)}>
          Mở phiếu sàng lọc
        </Button>
        <Button disabled={!row.intakeCompleted} onClick={() => onAssign(row)}>
          Bàn giao & phân phòng
        </Button>
        {row.clinicTicketNumber && (
          <Button
            danger
            disabled={busy || row.status === "CLINIC_CALLED"}
            onClick={() => onReissue(row)}
          >
            Cấp lại số khám
          </Button>
        )}
      </div>
    );
  const queueList = (
    <div className={styles.queueList}>
      {loading && !rows.length ? (
        <Skeleton active />
      ) : visibleRows.length ? (
        visibleRows.map((row) => (
          <article
            key={row.visitId}
            className={`${styles.queueCard} ${row.visitId === active?.visitId ? styles.activeQueue : ""} ${row.status === "EMERGENCY_DISPATCHED" ? styles.urgentQueue : ""}`}
          >
            <button
              className={styles.patientSelect}
              onClick={() => setActiveId(row.visitId)}
              aria-pressed={row.visitId === active?.visitId}
            >
              <span className={styles.queueNumber}>{row.hallTicketNumber}</span>
              <span>
                <strong>{row.patient.name}</strong>
                <small title={row.patient.id}>Mã BN: {shortIdentifier(row.patient.id)}</small>
              </span>
            </button>
            <div className={styles.tags}>
              {row.isPriority && <Tag color="gold">{row.priorityReason || "Ưu tiên"}</Tag>}
              <Tag color={row.intakeCompleted ? "cyan" : undefined}>
                {row.intakeCompleted
                  ? "Đã đo sinh hiệu"
                  : row.triageArrival === "travelling"
                    ? "Đang di chuyển"
                    : row.triageArrival === "in-service"
                      ? "Đang sàng lọc"
                      : "Chờ sàng lọc"}
              </Tag>
            </div>
            <p>{row.chiefComplaint || "Chưa ghi nhận lý do khám"}</p>
            {queuePage ? (
              actions(row)
            ) : (
              <Button
                block
                type={row.visitId === active?.visitId ? "primary" : "default"}
                onClick={() => {
                  setActiveId(row.visitId);
                  onOpen(row);
                }}
                disabled={row.status === "EMERGENCY_DISPATCHED" || busy}
              >
                Mở phiếu sàng lọc →
              </Button>
            )}
          </article>
        ))
      ) : (
        <div className={styles.card}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              search ? "Không tìm thấy bệnh nhân phù hợp" : "Chưa có bệnh nhân trong danh sách"
            }
          />
        </div>
      )}
    </div>
  );
  const filters = (
    <div className={styles.filters}>
      <Input
        allowClear
        prefix={<NurseIcon name="43-47-imgIcon" width={15} />}
        aria-label="Tìm bệnh nhân"
        placeholder="Tìm số tiếp nhận, mã BN, họ tên…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className={styles.segmented} aria-label="Lọc hàng đợi">
        {[
          ["all", "Tất cả"],
          ["waiting", "Đang chờ"],
          ["priority", "Ưu tiên"],
          ["done", "Đã đo"],
        ].map(([key, label]) => (
          <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <>
      <div className={styles.breadcrumb}>
        Trạm điều dưỡng Ngoại trú › <strong>{title}</strong>
      </div>
      <div className={styles.pageHeading}>
        <div>
          <h1>{title}</h1>
          <p>
            {history
              ? "Các lượt đã bàn giao trong phiên làm việc này. Lịch sử không được giữ sau khi tải lại trang."
              : records
                ? "Tìm bệnh nhân trong danh sách tiếp nhận được cấp quyền."
                : "Tiếp nhận bệnh nhân, ghi nhận dấu hiệu sinh tồn và phân luồng chuyên khoa an toàn."}
          </p>
        </div>
        <Button onClick={onRefresh} loading={busy}>
          ↻ Làm mới
        </Button>
      </div>
      {
        <div className={styles.metrics}>
          {[
            ["Đang chờ", pending.length, "bệnh nhân", "waiting"],
            [
              "Đã đo sinh hiệu",
              rows.filter((row) => row.intakeCompleted).length,
              "bệnh nhân",
              "done",
            ],
            ["Ưu tiên", rows.filter((row) => row.isPriority).length, "bệnh nhân", "priority"],
            [
              "Chuyển cấp cứu",
              rows.filter((row) => row.status === "EMERGENCY_DISPATCHED").length,
              "bệnh nhân",
              "emergency",
            ],
          ].map(([label, value, unit, tone]) => (
            <div className={styles.card} key={label} data-tone={tone}>
              <small>{label}</small>
              <strong>{value}</strong>
              <small>{unit}</small>
            </div>
          ))}
        </div>
      }
      <div className={queuePage ? styles.queueLayout : styles.dashboardGrid}>
        <section className={styles.stack} aria-label="Hàng đợi sàng lọc">
          <div className={styles.card}>
            <div className={styles.cardHeading}>
              <h2>
                <NurseIcon name="43-47-imgContainer" width={17} height={15} />
                Hàng đợi sàng lọc
              </h2>
              <span className={styles.pill}>{rows.length} BN</span>
            </div>
            {filters}
            {!queuePage && (
              <Button
                type="primary"
                block
                disabled={!pending.length || busy}
                onClick={() => onOpen(pending[0])}
              >
                Mở bệnh nhân tiếp theo →
              </Button>
            )}
          </div>
          {queueList}
        </section>
        {!queuePage && (
          <section className={styles.stack} aria-label="Bệnh nhân đang sàng lọc">
            {active ? (
              <>
                <div className={styles.card}>
                  <div className={styles.cardHeading}>
                    <span className={styles.eyebrow}>Bệnh nhân đang chọn</span>
                    <span className={styles.pill}>Phòng 102</span>
                  </div>
                  <PatientIdentity visit={active} />
                  <p className={styles.muted}>
                    Tiếp nhận: {formatDateTime(active.createdAt)} ·{" "}
                    {active.intakeCompleted ? "Đã ghi nhận sinh hiệu" : "Chưa ghi nhận sinh hiệu"}
                  </p>
                </div>
                <div className={styles.card}>
                  <h2>
                    <NurseIcon name="43-310-imgContainer" width={20} height={15} />
                    Dấu hiệu sinh tồn ban đầu
                  </h2>
                  <VitalSummary values={intakes[active.visitId]} />
                  <p className={styles.muted}>
                    {intakes[active.visitId]?.notes ||
                      (active.intakeCompleted
                        ? "Sinh hiệu đã lưu trên hệ thống. Mở phiếu để ghi nhận số đo mới."
                        : "Chưa nhập số đo. Mở phiếu sàng lọc để bắt đầu.")}
                  </p>
                </div>
                <div className={styles.card}>
                  <h2>Triệu chứng bệnh nhân đã khai</h2>
                  <div className={styles.soft}>
                    <small>Lý do khám chính</small>
                    <h3>{active.chiefComplaint || "Chưa ghi nhận"}</h3>
                  </div>
                  <div className={styles.tags}>
                    {[active.symptomOnset, active.symptomDuration, active.symptomSeverity]
                      .filter(Boolean)
                      .map((value, i) => (
                        <span key={i} className={styles.pill}>
                          {value}
                        </span>
                      ))}
                  </div>
                  <p className={styles.muted}>
                    Đối chiếu trực tiếp với người bệnh trước khi nhập chỉ số sinh hiệu.
                  </p>
                </div>
                <div className={styles.card}>
                  <h2>Bàn giao sau sàng lọc</h2>
                  <p className={styles.muted}>
                    {active.status === "EMERGENCY_DISPATCHED"
                      ? "Đã chuyển luồng cấp cứu. Không phân phòng khám thường."
                      : active.intakeCompleted
                        ? "Đã lưu sàng lọc. Chọn chuyên khoa và xác nhận phòng tiếp nhận."
                        : "Ghi nhận và lưu sinh hiệu trước khi bàn giao đến phòng khám."}
                  </p>
                  {actions(active)}
                </div>
              </>
            ) : (
              <div className={styles.card}>
                <Empty description="Chọn một bệnh nhân để bắt đầu sàng lọc" />
              </div>
            )}
          </section>
        )}
        <aside className={styles.stack}>
          <div className={styles.card}>
            <div className={styles.cardHeading}>
              <h2>Phòng sàng lọc 102</h2>
              <span className={styles.pill}>Điều dưỡng</span>
            </div>
            <div className={styles.soft}>
              <small>Hàng đợi hiện tại</small>
              <h3>{pending.length} bệnh nhân chờ sàng lọc</h3>
            </div>
            <p className={styles.muted}>Dữ liệu được cập nhật tự động mỗi 5 giây.</p>
            <Button block onClick={onRefresh}>
              Làm mới hàng đợi
            </Button>
          </div>
          <div className={styles.card}>
            <h2>Quy trình sàng lọc</h2>
            <ol className={styles.steps}>
              <li>Đối chiếu thông tin, triệu chứng</li>
              <li>Ghi nhận chỉ số sinh hiệu</li>
              <li>Xác nhận sàng lọc và phân phòng</li>
            </ol>
          </div>
          <div className={styles.safety}>
            <h2>An toàn phân luồng</h2>
            <p>
              Kiểm tra dấu hiệu nguy cấp và cảnh báo NEWS2. Ca đã chuyển cấp cứu không được phân vào
              phòng khám thường.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
