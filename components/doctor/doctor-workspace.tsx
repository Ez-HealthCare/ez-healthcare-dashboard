"use client";

import { formatTime, shiftLabel } from "@/lib/display-format";
import { VISIT_STATUS_LABELS } from "@/lib/visit-status";

import { confirmDiscardChanges } from "@/hooks/use-unsaved-changes";
import { useRouter, useSearchParams } from "next/navigation";
import {
  doctorBoardLink,
  doctorInitialView,
  doctorResultVisits,
  selectDoctorVisit,
  type DoctorView,
} from "@/lib/doctor-navigation";
import { useRef, useState } from "react";
import Image from "next/image";
import { Alert, Button, Empty, Input, Popconfirm, Select, Skeleton, Tag, message } from "antd";
import { StaffWorkspaceShell } from "@/components/layout/staff-workspace-shell";
import { useIdentity } from "@/hooks/use-auth-session";
import { useReceptionLive } from "@/hooks/use-reception-live";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import type { ClinicQueueItem } from "@/lib/types/clinical";
import type { DoctorCompletion } from "@/lib/types/doctor";
import { DoctorWorkbench } from "./doctor-workbench";
import { DoctorHistory } from "./doctor-history";
import styles from "./doctor-workspace.module.css";

export type { DoctorView } from "@/lib/doctor-navigation";
export type DoctorAction = (action: () => Promise<unknown>, success: string) => Promise<boolean>;
export const DOCTOR_STATUS: Record<string, string> = VISIT_STATUS_LABELS;

export function DoctorWorkspace({ section = "" }: { section?: string }) {
  const searchParams = useSearchParams();
  const requestedVisit = searchParams.get("visitId") || "";
  const requestedView = searchParams.get("view") || "";
  const rooms = useClinicalData(clinicalActions.doctorRooms, 30_000);
  const [roomCode, setRoomCode] = useState("");
  const room = rooms.data?.find((item) => item.code === roomCode) || rooms.data?.[0];
  return (
    <StaffWorkspaceShell
      workspace="doctor"
      section={section}
      stationLabel={room ? `${room.code} · ${room.name}` : "Phòng khám bác sĩ"}
    >
      <div className={styles.doctorSurface}>
        {section === "history" ? (
          <DoctorHistory />
        ) : (
          <>
            <div className={styles.roomSelector}>
              <span>Phòng khám được phân công</span>
              {rooms.data?.length === 1 && room ? (
                <strong className={styles.assignedRoom}>
                  {room.code} · {room.name} <span>{shiftLabel(room.shiftType)}</span>
                </strong>
              ) : (
                <Select
                  aria-label="Phòng được phân công"
                  value={room?.code}
                  loading={rooms.loading}
                  placeholder="Chọn phòng khám"
                  onChange={(code) => {
                    if (confirmDiscardChanges()) setRoomCode(code);
                  }}
                  options={(rooms.data || []).map((item) => ({
                    value: item.code,
                    label: `${item.code} · ${item.name} · ${shiftLabel(item.shiftType)}`,
                  }))}
                />
              )}
            </div>
            {rooms.error ? (
              <Alert
                type="error"
                showIcon
                title="Không tải được phòng khám"
                description={rooms.error}
                action={<Button onClick={() => void rooms.refresh()}>Thử lại</Button>}
              />
            ) : room ? (
              <DoctorRoom
                key={room.code + section + requestedVisit + requestedView}
                room={room}
                section={section}
              />
            ) : rooms.loading ? (
              <Skeleton active />
            ) : (
              <div className={styles.card}>
                <Empty description="Chưa có phòng khám được phân công" />
              </div>
            )}
          </>
        )}
      </div>
    </StaffWorkspaceShell>
  );
}

function DoctorRoom({ room, section }: { room: { code: string; name: string }; section: string }) {
  const router = useRouter();
  const user = useIdentity();
  const queue = useClinicalData(() => clinicalActions.roomQueue(room.code));
  useReceptionLive(true, queue.refresh);
  const params = useSearchParams();
  const requestedVisit = params.get("visitId") || "";
  const [activeId, setActiveId] = useState(requestedVisit);
  const [mobilePane, setMobilePane] = useState("record");
  const [showMetrics, setShowMetrics] = useState(false);
  const [editedPatient, setEditedPatient] = useState<ClinicQueueItem>();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<DoctorView>(doctorInitialView(section, params.get("view")));
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [actionError, setActionError] = useState("");
  const [completion, setCompletion] = useState<DoctorCompletion>();
  const [toast, context] = message.useMessage();
  const rows = queue.data?.queue || [];
  const resultsOnly = section === "results";
  const showQueue = view === "dashboard" || resultsOnly;
  const pendingResults = doctorResultVisits(rows);
  const contextRows = resultsOnly ? pendingResults : rows;
  const active = selectDoctorVisit(
    rows,
    user.id,
    activeId,
    requestedVisit,
    editedPatient,
    resultsOnly
  );
  const roomOccupied = rows.some((item) => item.status === "IN_EXAMINATION");
  const waiting = rows.filter((item) => item.status === "CLINIC_WAITING");
  const visible = contextRows.filter((item) => {
    const matches = `${item.patientName} ${item.clinicTicketNumber} ${item.hallTicketNumber}`
      .toLocaleLowerCase("vi-VN")
      .includes(search.trim().toLocaleLowerCase("vi-VN"));
    return (
      matches &&
      (filter === "all" ||
        (filter === "ready"
          ? item.status === "RE_EXAM_CALLING"
          : filter === "waiting"
            ? item.status === "CLINIC_WAITING"
            : filter === "results"
              ? ["PARACLINICAL_PENDING", "RE_EXAM_CALLING"].includes(item.status)
              : item.isPriority))
    );
  });
  const act: DoctorAction = async (action, success) => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setActionError("");
    try {
      await action();
      toast.success(success);
      await queue.refresh();
      return true;
    } catch (error) {
      setActionError(clinicalErrorMessage(error));
      await queue.refresh();
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const open = (patient: ClinicQueueItem, target: DoctorView) => {
    if (patient.visitId !== active?.visitId && !confirmDiscardChanges()) return;
    if (resultsOnly && target !== "results") {
      if (confirmDiscardChanges()) router.push(doctorBoardLink(patient.visitId, target));
      return;
    }
    setEditedPatient(undefined);
    setActiveId(patient.visitId);
    setView(target);
    setMobilePane("record");
    setCompletion(undefined);
  };
  const title = completion
    ? completion.title
    : view === "clinical"
      ? "Khám lâm sàng"
      : view === "orders"
        ? "Tạo chỉ định cận lâm sàng"
        : view === "results"
          ? "Kết quả cận lâm sàng"
          : view === "transfer"
            ? "Điều phối chuyển chuyên khoa"
            : view === "conclusion"
              ? "Kết luận chẩn đoán & Kê đơn"
              : "Bàn khám";
  return (
    <div className={styles.workspace} data-section={resultsOnly ? "results" : "board"}>
      {context}
      <div className={styles.breadcrumb}>
        Bác sĩ › {room.code} · {room.name} › <strong>{title}</strong>
      </div>
      <div className={styles.pageHeading}>
        <div>
          <h1>{title}</h1>
          <p>Theo dõi hàng đợi, tiếp nhận người bệnh và hoàn tất hồ sơ khám.</p>
        </div>
        <div className={styles.actions}>
          <Button disabled={busy} onClick={() => void queue.refresh()}>
            ↻ Làm mới
          </Button>
          {view === "dashboard" && !completion && (
            <Button
              type="primary"
              loading={busy}
              disabled={!waiting.length || roomOccupied}
              onClick={() => {
                const next = waiting[0];
                if (next) {
                  if (next.visitId !== active?.visitId && !confirmDiscardChanges()) return;
                  setEditedPatient(undefined);
                  setActiveId(next.visitId);
                  void act(() => clinicalActions.call(next.visitId), "Đã gọi bệnh nhân tiếp theo.");
                }
              }}
            >
              <Image src="/doctor/call.svg" width={17} height={14} alt="" />
              Gọi bệnh nhân tiếp theo
            </Button>
          )}
          {view !== "dashboard" && (
            <Button
              disabled={busy}
              onClick={() => {
                if (resultsOnly) {
                  if (confirmDiscardChanges()) router.push(doctorBoardLink(active?.visitId));
                } else setView("dashboard");
              }}
            >
              ← Bàn khám
            </Button>
          )}
        </div>
      </div>
      {requestedVisit &&
        !queue.loading &&
        !contextRows.some((row) => row.visitId === requestedVisit) && (
          <Alert
            type="info"
            showIcon
            title={
              resultsOnly
                ? "Lượt này không còn trong danh sách chờ hoặc có kết quả CLS"
                : "Lượt được nhắc đến không còn trong hàng đợi phòng này"
            }
            description={
              resultsOnly
                ? "Mở Bàn khám để kiểm tra lượt đang khám. Hệ thống không tự mở hồ sơ khác thay thế."
                : "Lượt có thể đã chuyển phòng hoặc hoàn tất. Kiểm tra phòng được phân công hoặc chọn một lượt khác trong hàng đợi; hệ thống không tự mở hồ sơ khác."
            }
            action={
              resultsOnly ? (
                <Button href={doctorBoardLink(requestedVisit)}>Mở Bàn khám</Button>
              ) : undefined
            }
          />
        )}
      {editedPatient && !rows.some((row) => row.visitId === editedPatient.visitId) && (
        <Alert
          type="warning"
          showIcon
          title="Lượt đang nhập không còn trong hàng đợi"
          description="Hồ sơ được giữ trên màn hình để bạn kiểm tra nội dung. Làm mới hồ sơ và đối chiếu trạng thái trước khi tiếp tục."
        />
      )}
      {actionError && (
        <Alert
          type="error"
          showIcon
          title="Chưa thực hiện được thao tác"
          description={actionError}
          closable
          onClose={() => setActionError("")}
        />
      )}
      {!resultsOnly && view === "dashboard" && roomOccupied && (
        <p role="status" className={styles.roomStatus}>
          Phòng đang có bệnh nhân được khám. Hoàn tất hoặc chuyển lượt đang khám trước khi gọi và
          tiếp nhận lượt tiếp theo.
        </p>
      )}
      {!resultsOnly && view === "dashboard" && !waiting.length && !roomOccupied && (
        <p role="status">Chưa có bệnh nhân chờ để gọi tiếp.</p>
      )}
      {queue.error && (
        <Alert
          type="error"
          showIcon
          title="Không tải được hàng đợi"
          description={queue.error}
          action={<Button onClick={() => void queue.refresh()}>Thử lại</Button>}
        />
      )}
      {completion ? (
        <section className={styles.card}>
          <div className={styles.successMark}>✓</div>
          <h2>{completion.title}</h2>
          <p>
            <strong>{completion.patient.patientName}</strong> ·{" "}
            {completion.patient.clinicTicketNumber}
          </p>
          <p>{completion.description}</p>
          <Button
            type="primary"
            onClick={() => {
              setCompletion(undefined);
              setView("dashboard");
            }}
          >
            Quay lại hàng đợi
          </Button>
        </section>
      ) : (
        <>
          {view === "dashboard" && (
            <>
              <button
                className={styles.metricsToggle}
                aria-expanded={showMetrics}
                aria-controls="doctor-metrics"
                onClick={() => setShowMetrics(!showMetrics)}
              >
                Tổng quan hàng đợi · {waiting.length} chờ khám
              </button>
              <div id="doctor-metrics" className={styles.metrics} data-expanded={showMetrics}>
                {[
                  ["Chờ khám", waiting.length, "queue", "waiting"],
                  [
                    "Đang khám",
                    rows.filter((row) => row.status === "IN_EXAMINATION").length,
                    "exam",
                    "examining",
                  ],
                  ["Chờ / Có kết quả CLS", pendingResults.length, "complete", "results"],
                  ["Ưu tiên", rows.filter((row) => row.isPriority).length, "exam", "priority"],
                ].map(([label, value, icon, tone]) => (
                  <div className={styles.metric} key={label} data-tone={tone}>
                    <div className={styles.cardHeading}>
                      <small>{label}</small>
                      <Image src={`/doctor/${icon}.svg`} width={18} height={18} alt="" />
                    </div>
                    <strong>{value}</strong>
                    <span>người bệnh</span>
                  </div>
                ))}
              </div>
              <p className={styles.meta}>Số liệu theo hàng đợi hiện tại của phòng khám.</p>
            </>
          )}
          {showQueue && (
            <div className={styles.mobileSwitch} role="group" aria-label="Chuyển vùng làm việc">
              <button
                aria-pressed={mobilePane === "queue"}
                aria-controls="doctor-queue"
                onClick={() => setMobilePane("queue")}
              >
                Hàng đợi ({contextRows.length})
              </button>
              <button
                aria-pressed={mobilePane === "record"}
                aria-controls="doctor-record"
                onClick={() => setMobilePane("record")}
              >
                Hồ sơ đang chọn
              </button>
            </div>
          )}
          <div
            className={showQueue ? styles.dashboardGrid : styles.stack}
            data-pane={mobilePane}
            data-support={!resultsOnly && pendingResults.length > 0}
          >
            {showQueue && (
              <aside
                id="doctor-queue"
                className={`${styles.stack} ${styles.queuePane}`}
                aria-label="Hàng đợi phòng khám"
              >
                <div className={`${styles.card} ${styles.queueToolbar}`}>
                  <div className={styles.queueHeading}>
                    <div>
                      <h2>{resultsOnly ? "Theo dõi CLS" : "Hàng đợi"}</h2>
                      <span className={styles.queueRoom}>Phòng {room.code}</span>
                    </div>
                    <span
                      className={styles.queueCount}
                      aria-label={`${contextRows.length} người bệnh`}
                    >
                      {contextRows.length} lượt
                    </span>
                  </div>
                  <label className={styles.queueSearchLabel} htmlFor="doctor-queue-search">
                    Tìm người bệnh
                  </label>
                  <Input
                    id="doctor-queue-search"
                    aria-label="Tìm bệnh nhân trong hàng đợi"
                    allowClear
                    placeholder="Tên, số khám, số tiếp nhận"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <div className={styles.filters} role="group" aria-label="Lọc hàng đợi">
                    {(resultsOnly
                      ? [
                          ["all", "Tất cả"],
                          ["ready", "Đã có kết quả"],
                        ]
                      : [
                          ["all", "Tất cả"],
                          ["waiting", "Chờ khám"],
                          ["results", "Có / Chờ KQ"],
                          ["priority", "Ưu tiên"],
                        ]
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        aria-pressed={filter === key}
                        onClick={() => setFilter(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {queue.loading && !rows.length ? (
                  <Skeleton active />
                ) : visible.length ? (
                  visible.map((row) => (
                    <article
                      className={`${styles.queueCard} ${row.visitId === active?.visitId ? styles.selected : ""}`}
                      key={row.visitId}
                    >
                      <button
                        className={styles.patientSelect}
                        onClick={() => {
                          if (row.visitId === active?.visitId || confirmDiscardChanges()) {
                            if (row.visitId !== active?.visitId) setEditedPatient(undefined);
                            setActiveId(row.visitId);
                            setMobilePane("record");
                          }
                        }}
                        aria-pressed={row.visitId === active?.visitId}
                      >
                        <span className={styles.pill}>{row.clinicTicketNumber}</span>
                        <strong>{row.patientName}</strong>
                      </button>
                      <div className={styles.tags}>
                        <Tag color={row.status === "IN_EXAMINATION" ? "cyan" : undefined}>
                          {row.status === "CLINIC_WAITING" && row.clinicArrivedAt === null
                            ? "Đang di chuyển"
                            : DOCTOR_STATUS[row.status] || row.status}
                        </Tag>
                        {row.isPriority && (
                          <Tag color="gold">{row.priorityReason || "Ưu tiên"}</Tag>
                        )}
                      </div>
                      {row.status === "TEMPORARILY_ABSENT" && row.returnReportedAt && (
                        <Tag color="green">
                          Đã báo quay lại · {formatTime(row.returnReportedAt)}
                        </Tag>
                      )}
                      <p>{row.chiefComplaint || "Chưa ghi nhận lý do khám"}</p>
                      {row.currentDoctor && (
                        <p className={styles.meta}>
                          Bác sĩ phụ trách: {row.currentDoctor.name}
                          {row.currentDoctor.id === user.id ? " · Bạn" : ""}
                        </p>
                      )}
                      <div className={styles.actions} data-results={resultsOnly}>
                        {!resultsOnly &&
                          ["CLINIC_WAITING", "CLINIC_CALLED", "RE_EXAM_CALLING"].includes(
                            row.status
                          ) && (
                            <>
                              {row.status !== "RE_EXAM_CALLING" && (
                                <Button
                                  size="small"
                                  disabled={
                                    busy ||
                                    roomOccupied ||
                                    !["CLINIC_WAITING", "CLINIC_CALLED"].includes(row.status)
                                  }
                                  onClick={() =>
                                    void act(
                                      () => clinicalActions.call(row.visitId),
                                      "Đã gọi bệnh nhân."
                                    )
                                  }
                                >
                                  Gọi ({row.callAttempts}/3)
                                </Button>
                              )}
                              {row.status !== "CLINIC_WAITING" && (
                                <Button
                                  size="small"
                                  type="primary"
                                  disabled={
                                    busy ||
                                    roomOccupied ||
                                    !["CLINIC_CALLED", "RE_EXAM_CALLING"].includes(row.status)
                                  }
                                  onClick={async () => {
                                    if (row.visitId !== active?.visitId && !confirmDiscardChanges())
                                      return;
                                    if (
                                      await act(
                                        () => clinicalActions.startExam(row.visitId),
                                        "Đã tiếp nhận khám."
                                      )
                                    )
                                      open(row, "clinical");
                                  }}
                                >
                                  Tiếp nhận khám
                                </Button>
                              )}
                            </>
                          )}
                        <Button
                          size="small"
                          disabled={busy}
                          onClick={() =>
                            open(
                              row,
                              ["PARACLINICAL_PENDING", "RE_EXAM_CALLING"].includes(row.status)
                                ? "results"
                                : "clinical"
                            )
                          }
                        >
                          {resultsOnly ? "Xem kết quả" : "Mở hồ sơ"}
                        </Button>
                        {row.status === "TEMPORARILY_ABSENT" && (
                          <Popconfirm
                            title={
                              row.returnReportedAt
                                ? "Xác nhận xếp lại người bệnh đã báo quay lại"
                                : "Người bệnh đã quay lại?"
                            }
                            description="Giữ số khám, xếp lại cuối hàng theo mức ưu tiên và đặt số lần gọi về 0."
                            okText="Xác nhận xếp lại"
                            cancelText="Chưa quay lại"
                            disabled={busy}
                            okButtonProps={{ disabled: busy }}
                            onConfirm={() =>
                              act(
                                () =>
                                  clinicalActions.requeue(
                                    row.visitId,
                                    "Bác sĩ xác nhận người bệnh đã quay lại phòng khám"
                                  ),
                                "Đã đưa bệnh nhân về hàng đợi; số lần gọi đã đặt lại về 0."
                              )
                            }
                          >
                            <Button size="small" disabled={busy}>
                              Đưa về cuối hàng
                            </Button>
                          </Popconfirm>
                        )}
                      </div>
                    </article>
                  ))
                ) : contextRows.length > 0 ? (
                  <div className={styles.card}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Không có bệnh nhân phù hợp"
                    />
                  </div>
                ) : null}
              </aside>
            )}
            <div id="doctor-record" className={styles.recordPane}>
              {active ? (
                <DoctorWorkbench
                  key={active.visitId}
                  onEdit={setEditedPatient}
                  patient={active}
                  room={room}
                  view={view}
                  busy={busy}
                  canReceive={
                    !rows.some(
                      (item) => item.status === "IN_EXAMINATION" && item.visitId !== active.visitId
                    )
                  }
                  act={act}
                  onView={(target) => {
                    if (resultsOnly && target !== "results") {
                      if (confirmDiscardChanges())
                        router.push(doctorBoardLink(active.visitId, target));
                    } else setView(target);
                  }}
                  onComplete={(result) => {
                    setEditedPatient(undefined);
                    setCompletion(result);
                  }}
                />
              ) : (
                <div className={`${styles.card} ${styles.emptyRecord}`}>
                  {queue.loading ? (
                    <Skeleton active />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        resultsOnly
                          ? "Chưa có lượt chờ hoặc có kết quả CLS"
                          : "Chưa có bệnh nhân trong phòng khám"
                      }
                    />
                  )}
                </div>
              )}
              {!resultsOnly && view === "dashboard" && pendingResults.length > 0 && (
                <aside className={`${styles.stack} ${styles.supportPane}`}>
                  <section className={styles.card}>
                    <div className={styles.supportHeading}>
                      <h2>Theo dõi cận lâm sàng</h2>
                      <span
                        className={styles.queueCount}
                        aria-label={`${pendingResults.length} lượt chờ hoặc có kết quả CLS`}
                      >
                        {pendingResults.length}
                      </span>
                    </div>
                    {pendingResults.length ? (
                      pendingResults.map((row) => (
                        <button
                          key={row.visitId}
                          className={styles.resultLink}
                          onClick={() => open(row, "results")}
                        >
                          <strong>{row.patientName}</strong>
                          <span>
                            {row.clinicTicketNumber} · {DOCTOR_STATUS[row.status]}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className={styles.meta}>Chưa có bệnh nhân chờ kết quả.</p>
                    )}
                  </section>
                </aside>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
