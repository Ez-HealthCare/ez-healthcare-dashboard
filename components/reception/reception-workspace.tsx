"use client";

import { Button, Empty, Input, Modal, QRCode, Spin, message } from "antd";
import { useMemo, useState } from "react";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import type { ReceptionVisit } from "@/lib/types/clinical";
import { ReceptionVerification } from "./reception-verification";
import styles from "./reception-workspace.module.css";

const statusLabel: Record<ReceptionVisit["status"], string> = {
  HALL_WAITING: "Chờ tiếp nhận",
  RECEPTION_VERIFIED: "Đã xác minh",
  TRIAGE_PENDING: "Chờ sàng lọc",
  CLINIC_WAITING: "Đã cấp số khám",
  CLINIC_CALLED: "Đã gọi vào phòng",
  TEMPORARILY_ABSENT: "Tạm vắng",
  IN_EXAMINATION: "Đang khám",
  PARACLINICAL_PENDING: "Chờ cận lâm sàng",
  RE_EXAM_CALLING: "Chờ tái khám",
  COMPLETED: "Hoàn tất",
  EMERGENCY_DISPATCHED: "Đã chuyển cấp cứu",
  CANCELLED: "Đã hủy",
};

function patientSearchText(visit: ReceptionVisit) {
  return [
    visit.hallTicketNumber,
    visit.clinicTicketNumber,
    visit.patient.name,
    visit.patient.nationalId,
    visit.patient.insuranceCardNumber,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("vi-VN");
}

function displayDate(value?: string) {
  if (!value) return "Chưa có dữ liệu";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

export function ReceptionWorkspace() {
  const queue = useClinicalData(clinicalActions.receptionQueue);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [acting, setActing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [qrValue, setQrValue] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [walkInPatient, setWalkInPatient] = useState<{ id: string; name: string }>();
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [issuedTicket, setIssuedTicket] = useState<{ visitId: string; hallTicketNumber: string }>();
  const [counterOpen, setCounterOpen] = useState(true);
  const [shiftNote, setShiftNote] = useState("");
  const [toast, context] = message.useMessage();

  const visits = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
    if (!normalizedQuery) return queue.data || [];
    return (queue.data || []).filter((visit) => patientSearchText(visit).includes(normalizedQuery));
  }, [query, queue.data]);

  const selected = visits.find((visit) => visit.visitId === selectedId) || visits[0];
  const isHallWaiting = (visit: ReceptionVisit) =>
    visit.ticketKind === "HALL" && visit.status === "HALL_WAITING";
  const waiting = (queue.data || []).filter(isHallWaiting).length;
  const verified = (queue.data || []).filter(
    (visit) => visit.status === "RECEPTION_VERIFIED"
  ).length;
  const called = (queue.data || []).filter((visit) => visit.ticketStatus === "CALLED").length;
  const nextVisit = (queue.data || []).find(
    (visit) => isHallWaiting(visit) && visit.ticketStatus === "ACTIVE"
  );

  const runQueueAction = async (action: () => Promise<unknown>, success: string) => {
    try {
      setActing(true);
      await action();
      toast.success(success);
      await queue.refresh();
    } catch (error) {
      toast.error(clinicalErrorMessage(error));
    } finally {
      setActing(false);
    }
  };

  const findQrTicket = () => {
    const value = qrValue.trim().toLocaleLowerCase("vi-VN");
    const matched = (queue.data || []).find((visit) =>
      [visit.visitId, visit.hallTicketNumber, visit.clinicTicketNumber]
        .filter(Boolean)
        .some((candidate) => candidate?.toLocaleLowerCase("vi-VN") === value)
    );
    if (!matched) {
      toast.error("Không tìm thấy lượt phù hợp với mã QR hoặc mã tiếp nhận.");
      return;
    }
    setQuery("");
    setSelectedId(matched.visitId);
    setQrOpen(false);
    setQrValue("");
    toast.success(`Đã mở hồ sơ số ${matched.hallTicketNumber}.`);
  };

  const lookupWalkIn = async () => {
    try {
      setWalkInLoading(true);
      const patient = await clinicalActions.findPatientByNationalId(nationalId.trim());
      setWalkInPatient(patient);
    } catch (error) {
      setWalkInPatient(undefined);
      toast.error(clinicalErrorMessage(error));
    } finally {
      setWalkInLoading(false);
    }
  };

  const createWalkIn = async () => {
    if (!walkInPatient) return;
    try {
      setWalkInLoading(true);
      const ticket = await clinicalActions.createWalkInTicket(walkInPatient.id);
      toast.success(`Đã cấp số tiếp nhận ${ticket.hallTicketNumber}.`);
      setWalkInOpen(false);
      setIssuedTicket({ visitId: ticket.visitId, hallTicketNumber: ticket.hallTicketNumber });
      setNationalId("");
      setWalkInPatient(undefined);
      await queue.refresh();
      setSelectedId(ticket.visitId);
    } catch (error) {
      toast.error(clinicalErrorMessage(error));
    } finally {
      setWalkInLoading(false);
    }
  };

  return (
    <section className={styles.workspace} aria-label="Bàn làm việc tiếp nhận ngoại trú">
      {context}
      <header className={styles.subheader}>
        <div>
          <div className={styles.eyebrow}>Khu tiếp đón trung tâm · HIS v4.8</div>
          <div className={styles.titleRow}>
            <h2>Bàn làm việc tiếp nhận ngoại trú</h2>
            <span className={styles.live}>Trực ban tích cực</span>
          </div>
          <p>Tra cứu hồ sơ, đối soát hành chính và bàn giao người bệnh sang sàng lọc.</p>
        </div>
        <div className={styles.shift}>Ca hiện tại · 07:00 – 12:00</div>
      </header>

      {queue.error ? <p className={styles.error}>Không tải được hàng đợi: {queue.error}</p> : null}

      <div className={styles.grid}>
        <aside className={styles.card} aria-label="Hàng đợi tiếp nhận">
          <div className={styles.cardHeading}>
            <div>
              <span className={styles.kicker}>Hàng đợi tiếp nhận</span>
              <h3>{queue.loading ? "Đang tải" : `${waiting} đang chờ`}</h3>
            </div>
            <span className={styles.counter}>{queue.data?.length || 0}</span>
          </div>
          <div className={styles.queueHint}>Hệ thống gọi Patient đứng đầu hàng đợi tiếp nhận.</div>
          <div className={styles.queueControls}>
            <Button
              disabled={!nextVisit || acting}
              loading={acting}
              onClick={() =>
                nextVisit &&
                void runQueueAction(
                  () => clinicalActions.callNextReceptionTicket(),
                  `Đã gọi số ${nextVisit.hallTicketNumber}.`
                )
              }
              type="primary"
            >
              Gọi số tiếp theo
            </Button>
            {selected ? (
              <span className={styles.callMeta}>
                {selected.callAttempts ? `Đã gọi ${selected.callAttempts} lần` : "Chưa gọi"}
              </span>
            ) : null}
          </div>
          <div className={styles.queueList}>
            {queue.loading ? (
              <Spin />
            ) : visits.length ? (
              visits.map((visit) => (
                <button
                  className={`${styles.queueItem} ${visit.visitId === selected?.visitId ? styles.selected : ""}`}
                  key={visit.visitId}
                  onClick={() => setSelectedId(visit.visitId)}
                  type="button"
                >
                  <span className={styles.ticket}>{visit.hallTicketNumber}</span>
                  <span className={styles.queuePatient}>
                    <strong>{visit.patient.name}</strong>
                    <small>
                      {visit.ticketStatus === "CALLED"
                        ? "Đang gọi tại quầy"
                        : statusLabel[visit.status]}
                    </small>
                  </span>
                  {visit.isPriority ? <span className={styles.priority}>Ưu tiên</span> : null}
                </button>
              ))
            ) : (
              <Empty description="Không có lượt phù hợp" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        </aside>

        <section className={styles.card} aria-label="Tra cứu và tiếp nhận lượt khám">
          <div className={styles.cardHeading}>
            <div>
              <span className={styles.kicker}>Tra cứu & tiếp nhận</span>
              <h3>Hồ sơ người bệnh</h3>
            </div>
            <span className={styles.readOnly}>Đối soát hồ sơ</span>
          </div>
          <Input
            aria-label="Tìm mã tiếp nhận hoặc hồ sơ bệnh nhân"
            className={styles.search}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Số tiếp nhận, họ tên, CCCD hoặc BHYT"
            value={query}
          />
          {selected ? (
            <div className={styles.patientCard}>
              <div className={styles.identity}>
                <span className={styles.initial}>
                  {selected.patient.name.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <h4>{selected.patient.name}</h4>
                  <p>Mã tiếp nhận {selected.hallTicketNumber}</p>
                </div>
                <span className={styles.status}>{statusLabel[selected.status]}</span>
              </div>
              <dl className={styles.details}>
                <div>
                  <dt>Ngày sinh</dt>
                  <dd>{displayDate(selected.patient.dateOfBirth)}</dd>
                </div>
                <div>
                  <dt>CCCD</dt>
                  <dd>{selected.patient.nationalId || "Chưa đối soát"}</dd>
                </div>
                <div>
                  <dt>BHYT</dt>
                  <dd>{selected.patient.insuranceCardNumber || "Chưa đối soát"}</dd>
                </div>
                <div>
                  <dt>Lý do khám</dt>
                  <dd>{selected.chiefComplaint || "Chưa ghi nhận — Điều dưỡng sẽ khai thác."}</dd>
                </div>
              </dl>
              <div className={styles.handoff}>
                <strong>Trạng thái bàn giao</strong>
                <span>
                  {selected.status === "RECEPTION_VERIFIED"
                    ? "Sẵn sàng cho sàng lọc"
                    : "Chờ hoàn tất đối soát hành chính"}
                </span>
              </div>
              {selected.ticketStatus === "CALLED" ? (
                <div className={styles.hallActions}>
                  <strong>Patient đang được gọi đến quầy</strong>
                  <span>Hoàn tất xác minh để chuyển Patient sang điều dưỡng sàng lọc.</span>
                </div>
              ) : null}
              <ReceptionVerification visit={selected} onComplete={queue.refresh} />
            </div>
          ) : (
            <Empty description="Chọn một lượt trong hàng đợi để xem hồ sơ" />
          )}
        </section>

        <aside className={styles.rightColumn} aria-label="Trạng thái quầy và thao tác nhanh">
          <section className={styles.card}>
            <span className={styles.kicker}>Trạng thái quầy</span>
            <h3>Quầy tiếp đón 02</h3>
            <p className={counterOpen ? styles.open : styles.closed}>
              {counterOpen ? "● Đang hoạt động" : "● Tạm ngưng nhận lượt mới"}
            </p>
            <div className={styles.metrics}>
              <div>
                <strong>{waiting}</strong>
                <span>Đang chờ</span>
              </div>
              <div>
                <strong>{verified}</strong>
                <span>Đã xác minh</span>
              </div>
              <div>
                <strong>{called}</strong>
                <span>Đã gọi</span>
              </div>
            </div>
            <Button
              className={styles.counterToggle}
              onClick={() => setCounterOpen((open) => !open)}
            >
              {counterOpen ? "Tạm ngưng quầy" : "Mở lại quầy"}
            </Button>
          </section>
          <section className={styles.card}>
            <span className={styles.kicker}>Thao tác nhanh</span>
            <div className={styles.actions}>
              <button onClick={() => setQrOpen(true)} type="button">
                Quét mã QR
              </button>
              <button onClick={() => setWalkInOpen(true)} type="button">
                Tạo lượt walk-in
              </button>
              <button disabled type="button">
                Gọi loa sảnh
              </button>
            </div>
            <p className={styles.phaseNote}>
              Các thao tác này sẽ được mở ở các phần triển khai tiếp theo.
            </p>
          </section>
          <section className={styles.note}>
            <strong>Ghi chú trực ban</strong>
            <p>
              Ưu tiên hướng dẫn người bệnh có dấu hiệu khó thở, đau ngực hoặc chóng mặt vào khu vực
              đánh giá nhanh.
            </p>
            <Input.TextArea
              aria-label="Ghi chú bàn giao ca"
              className={styles.shiftNote}
              onChange={(event) => setShiftNote(event.target.value)}
              placeholder="Thêm ghi chú cho ca trực này"
              rows={2}
              value={shiftNote}
            />
          </section>
        </aside>
      </div>
      <Modal
        cancelText="Hủy"
        okText="Mở hồ sơ"
        onCancel={() => {
          setQrOpen(false);
          setQrValue("");
        }}
        onOk={findQrTicket}
        open={qrOpen}
        title="Quét mã QR / nhập mã tiếp nhận"
      >
        <Input
          autoFocus
          onChange={(event) => setQrValue(event.target.value)}
          placeholder="Ví dụ: A-001"
          value={qrValue}
        />
      </Modal>
      <Modal
        cancelText="Hủy"
        okButtonProps={{ disabled: !walkInPatient, loading: walkInLoading }}
        okText="Cấp số tiếp nhận"
        onCancel={() => {
          setWalkInOpen(false);
          setNationalId("");
          setWalkInPatient(undefined);
        }}
        onOk={() => void createWalkIn()}
        open={walkInOpen}
        title="Tạo lượt khám walk-in"
      >
        <p>Tra cứu hồ sơ bệnh nhân bằng CCCD trước khi cấp số.</p>
        <div className={styles.walkInLookup}>
          <Input
            onChange={(event) => setNationalId(event.target.value)}
            placeholder="Số CCCD"
            value={nationalId}
          />
          <Button
            disabled={!nationalId.trim()}
            loading={walkInLoading}
            onClick={() => void lookupWalkIn()}
          >
            Tra cứu
          </Button>
        </div>
        {walkInPatient ? (
          <p className={styles.walkInPatient}>
            Hồ sơ: <strong>{walkInPatient.name}</strong>
          </p>
        ) : null}
      </Modal>
      <Modal
        cancelText="Đóng"
        footer={
          <div className={styles.ticketActions}>
            <Button onClick={() => setIssuedTicket(undefined)}>Đóng</Button>
            <Button onClick={() => window.print()} type="primary">
              In phiếu
            </Button>
          </div>
        }
        onCancel={() => setIssuedTicket(undefined)}
        open={!!issuedTicket}
        title="Cấp số tiếp nhận thành công"
      >
        {issuedTicket ? (
          <div className={styles.successTicket}>
            <span className={styles.successMark}>✓</span>
            <p>Đã tạo lượt khám walk-in. Vui lòng hướng dẫn người bệnh chờ tại sảnh tiếp đón.</p>
            <strong>{issuedTicket.hallTicketNumber}</strong>
            <div className={styles.ticketQr}>
              <QRCode
                bordered={false}
                errorLevel="M"
                size={132}
                value={JSON.stringify({
                  visitId: issuedTicket.visitId,
                  ticket: issuedTicket.hallTicketNumber,
                })}
              />
              <span>Quét mã để tra cứu lượt khám</span>
            </div>
            <dl>
              <div>
                <dt>Trạng thái</dt>
                <dd>Chờ tiếp nhận</dd>
              </div>
              <div>
                <dt>Thời gian cấp</dt>
                <dd>
                  {new Intl.DateTimeFormat("vi-VN", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date())}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
