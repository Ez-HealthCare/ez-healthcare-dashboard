"use client";

import { formatDate, formatDateTime } from "@/lib/display-format";
import { RecordIdentifier } from "@/components/clinical/record-identifier";

import { confirmDiscardChanges } from "@/hooks/use-unsaved-changes";
import { Alert, Button, Empty, Input, Modal, QRCode, Spin, message } from "antd";
import Image from "next/image";
import Link from "next/link";
import { RECEPTION_STATUS } from "@/lib/constants/reception";
import { ROUTES } from "@/lib/constants/routes";
import { useIdentity } from "@/hooks/use-auth-session";
import { useMemo, useRef, useState } from "react";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import type { ReceptionVisit } from "@/lib/types/clinical";
import { ReceptionVerification } from "./reception-verification";
import styles from "./reception-workspace.module.css";

const statusLabel = RECEPTION_STATUS;

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

const displayDate = formatDate;

export function ReceptionWorkspace({ section = "" }: { section?: string }) {
  const user = useIdentity();
  const [queueFilter, setQueueFilter] = useState("all");
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verificationVisit, setVerificationVisit] = useState<ReceptionVisit>();
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const title = section === "queue" ? "Hàng đợi tiếp nhận" : "Bàn làm việc tiếp nhận ngoại trú";
  const queue = useClinicalData(clinicalActions.receptionQueue);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const actionLock = useRef(false);
  const walkInLock = useRef(false);
  const [actionError, setActionError] = useState("");
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
    return (queue.data || []).filter((visit) => {
      const matchesQuery = !normalizedQuery || patientSearchText(visit).includes(normalizedQuery);
      const matchesStatus =
        queueFilter === "all" ||
        (queueFilter === "waiting"
          ? visit.status === "HALL_WAITING" && visit.ticketStatus !== "CALLED"
          : queueFilter === "called"
            ? visit.ticketStatus === "CALLED"
            : visit.isPriority);
      return matchesQuery && matchesStatus;
    });
  }, [query, queue.data, queueFilter]);

  const selected = visits.find((visit) => visit.visitId === selectedId) || visits[0];
  const isHallWaiting = (visit: ReceptionVisit) =>
    visit.ticketKind === "HALL" && visit.status === "HALL_WAITING";
  const waiting = (queue.data || []).filter(
    (visit) => isHallWaiting(visit) && visit.ticketStatus === "ACTIVE"
  ).length;
  const totalAtDesk = queue.data?.length || 0;
  const called = (queue.data || []).filter((visit) => visit.ticketStatus === "CALLED").length;
  const nextVisit = (queue.data || []).find(
    (visit) => isHallWaiting(visit) && visit.ticketStatus === "ACTIVE"
  );

  const runQueueAction = async (action: () => Promise<unknown>, success: string) => {
    if (actionLock.current) return false;
    actionLock.current = true;
    setActionError("");
    try {
      setActing(true);
      await action();
      toast.success(success);
      await queue.refresh();
      return true;
    } catch (error) {
      setActionError(clinicalErrorMessage(error));
      return false;
    } finally {
      actionLock.current = false;
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
    if (walkInLock.current) return;
    walkInLock.current = true;
    setActionError("");
    try {
      setWalkInLoading(true);
      const patient = await clinicalActions.findPatientByNationalId(nationalId.trim());
      setWalkInPatient(patient);
    } catch (error) {
      setWalkInPatient(undefined);
      setActionError(clinicalErrorMessage(error));
    } finally {
      walkInLock.current = false;
      setWalkInLoading(false);
    }
  };

  const createWalkIn = async () => {
    if (!walkInPatient || walkInLock.current) return;
    walkInLock.current = true;
    setActionError("");
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
      setActionError(clinicalErrorMessage(error));
    } finally {
      walkInLock.current = false;
      setWalkInLoading(false);
    }
  };

  return (
    <section className={styles.workspace} aria-label="Bàn làm việc tiếp nhận ngoại trú">
      {context}
      {actionError && (
        <Alert
          type="error"
          showIcon
          title="Chưa thực hiện được thao tác"
          description={actionError}
        />
      )}
      <div className={styles.breadcrumb}>
        Khu tiếp đón trung tâm ›{" "}
        <strong>{section === "queue" ? "Hàng đợi tiếp nhận" : "Bàn làm việc tiếp nhận"}</strong>
      </div>
      <header className={styles.subheader}>
        <div>
          <div className={styles.titleRow}>
            <span className={styles.titleIcon}>
              <Image src="/reception/badge.svg" width={22} height={22} alt="" />
            </span>
            <h1>{title}</h1>
            <span className={styles.live}>Trực ban tích cực</span>
          </div>
          <p>Gọi người bệnh đã được cấp số, xác minh giấy tờ tại quầy và bàn giao sang sàng lọc.</p>
        </div>
        <Button loading={acting} onClick={() => void queue.refresh()}>
          ↻ Làm mới
        </Button>
      </header>

      {queue.error ? <p className={styles.error}>Không tải được hàng đợi: {queue.error}</p> : null}

      {section === "queue" && (
        <div className={styles.overviewMetrics}>
          {[
            [waiting, "Đang chờ"],
            [called, "Đang gọi"],
            [totalAtDesk, "Trong hàng đợi"],
          ].map(([value, label]) => (
            <div key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
              <span>Lượt trong hàng đợi hiện tại</span>
            </div>
          ))}
        </div>
      )}
      <div className={styles.grid}>
        <aside className={styles.card} aria-label="Hàng đợi tiếp nhận">
          <div className={styles.cardHeading}>
            <div>
              <span className={styles.kicker}>Hàng đợi tiếp nhận</span>
              <h3>{queue.loading ? "Đang tải" : `${waiting} đang chờ`}</h3>
            </div>
            <span className={styles.counter}>{queue.data?.length || 0}</span>
          </div>
          <div className={styles.queueFilters} aria-label="Lọc hàng đợi tiếp nhận">
            {[
              ["all", "Tất cả"],
              ["waiting", "Đang chờ"],
              ["called", "Đã gọi"],
              ["priority", "Ưu tiên"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={queueFilter === key}
                onClick={() => setQueueFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
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
              <Image src="/reception/call.svg" width={15} height={15} alt="" />
              Gọi số tiếp theo
            </Button>
            <div className={styles.secondaryCalls}>
              <Button
                disabled={
                  acting ||
                  !selected ||
                  selected.ticketStatus !== "CALLED" ||
                  selected.status !== "HALL_WAITING"
                }
                onClick={() => setPauseOpen(true)}
              >
                Tạm bỏ qua
              </Button>
              <Button
                disabled={
                  acting ||
                  !selected ||
                  selected.status !== "HALL_WAITING" ||
                  !["CALLED", "PAUSED"].includes(selected.ticketStatus || "")
                }
                onClick={() =>
                  selected &&
                  void runQueueAction(
                    () => clinicalActions.recallReceptionTicket(selected.visitId),
                    "Đã gọi lại số tiếp nhận."
                  )
                }
              >
                Gọi lại
              </Button>
            </div>
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
              <h2 className={styles.lookupTitle}>
                <Image src="/reception/lookup.svg" width={17} height={16} alt="" />
                Hồ sơ đang tiếp nhận
              </h2>
            </div>
            <span className={styles.readOnly}>Đối soát hồ sơ</span>
          </div>
          <div className={styles.lookup}>
            <Input
              prefix={<Image src="/reception/search.svg" width={15} height={15} alt="" />}
              allowClear
              aria-label="Tìm mã tiếp nhận hoặc hồ sơ bệnh nhân"
              className={styles.search}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Số tiếp nhận, họ tên, CCCD hoặc BHYT"
              value={query}
            />
            <Button type="primary" onClick={() => setQrOpen(true)}>
              Quét QR
            </Button>
          </div>
          {selected ? (
            <div className={styles.patientCard}>
              <div className={styles.identity}>
                <span className={styles.initial}>
                  {selected.patient.name
                    .split(/\s+/)
                    .slice(-2)
                    .map((part) => part[0])
                    .join("")}
                </span>
                <div>
                  <h4>{selected.patient.name}</h4>
                  <p>Mã tiếp nhận {selected.hallTicketNumber}</p>
                </div>
                <span className={styles.status}>{statusLabel[selected.status]}</span>
              </div>
              <dl className={styles.details}>
                <div>
                  <dt>Mã lượt khám</dt>
                  <dd>
                    <RecordIdentifier value={selected.visitId} />
                  </dd>
                </div>
                <div>
                  <dt>Số tiếp nhận</dt>
                  <dd className={styles.ticketNumber}>{selected.hallTicketNumber}</dd>
                </div>
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
              <section className={styles.verificationSummary}>
                <h3>Đối soát hồ sơ hành chính tiếp nhận</h3>
                <div className={styles.checklist}>
                  <div>
                    <strong>CCCD / VNeID</strong>
                    <span>
                      {selected.patient.nationalId
                        ? "Có thông tin · Cần đối chiếu trực tiếp"
                        : "Chưa có thông tin"}
                    </span>
                  </div>
                  <div>
                    <strong>Thẻ bảo hiểm y tế</strong>
                    <span>
                      {selected.patient.insuranceCardNumber
                        ? "Có thông tin thẻ BHYT"
                        : "Chưa cập nhật thẻ BHYT"}
                    </span>
                  </div>
                </div>
              </section>
              <Button
                type="primary"
                block
                className={styles.openVerification}
                onClick={() => {
                  setVerificationVisit(selected);
                  setVerificationOpen(true);
                }}
              >
                Mở phiếu tiếp nhận & xác minh →
              </Button>
            </div>
          ) : (
            <Empty description="Chọn một lượt trong hàng đợi để xem hồ sơ" />
          )}
        </section>

        <aside className={styles.rightColumn} aria-label="Trạng thái quầy và thao tác nhanh">
          <section className={styles.card}>
            <span className={styles.kicker}>Trạng thái quầy</span>
            <h3>Quầy tiếp đón 02</h3>
            <div className={styles.staffIdentity}>
              <span>{(user.name || user.email).slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{user.name || user.email}</strong>
                <small>Lễ tân · Quầy tiếp đón 02</small>
              </div>
            </div>
            <p className={counterOpen ? styles.open : styles.closed}>
              {counterOpen ? "● Đang hoạt động" : "● Tạm ngưng nhận lượt mới"}
            </p>
            <div className={styles.metrics}>
              <div>
                <strong>{waiting}</strong>
                <span>Đang chờ</span>
              </div>
              <div>
                <strong>{totalAtDesk}</strong>
                <span>Trong hàng đợi</span>
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
              <Link href={ROUTES.RECEPTIONIST + "/appointments"}>Tra cứu lịch hẹn khám →</Link>
              <Link href={ROUTES.RECEPTIONIST + "/requests"}>Yêu cầu tiếp nhận trực tuyến →</Link>
            </div>
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
        open={pauseOpen}
        title="Tạm bỏ qua lượt tiếp nhận"
        okText="Xác nhận tạm bỏ qua"
        cancelText="Quay lại"
        confirmLoading={acting}
        okButtonProps={{ disabled: !pauseReason.trim() || acting }}
        onCancel={() => {
          if (!acting) {
            setPauseOpen(false);
            setPauseReason("");
          }
        }}
        onOk={async () => {
          if (!selected || !pauseReason.trim() || acting) return;
          const saved = await runQueueAction(
            () => clinicalActions.pauseReceptionTicket(selected.visitId, pauseReason.trim()),
            "Đã tạm bỏ qua lượt tiếp nhận."
          );
          if (saved) {
            setPauseOpen(false);
            setPauseReason("");
          }
        }}
      >
        <p>
          Số tiếp nhận: <strong>{selected?.hallTicketNumber}</strong>
        </p>
        <Input.TextArea
          aria-label="Lý do tạm bỏ qua"
          placeholder="Nhập lý do tạm bỏ qua"
          value={pauseReason}
          onChange={(event) => setPauseReason(event.target.value)}
          disabled={acting}
        />
      </Modal>
      <Modal
        open={verificationOpen}
        onCancel={() => {
          if (confirmDiscardChanges()) setVerificationOpen(false);
        }}
        title="Phiếu tiếp nhận bệnh nhân"
        footer={null}
        width={760}
        destroyOnHidden
      >
        {verificationVisit && (
          <ReceptionVerification
            visit={verificationVisit}
            onComplete={async () => {
              setVerificationOpen(false);
              await queue.refresh();
            }}
          />
        )}
      </Modal>
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
          if (walkInLoading) return;
          setWalkInOpen(false);
          setNationalId("");
          setWalkInPatient(undefined);
        }}
        onOk={() => void createWalkIn()}
        open={walkInOpen}
        title="Tạo lượt khám walk-in"
      >
        {actionError && (
          <Alert type="error" showIcon title="Chưa cấp được số" description={actionError} />
        )}
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
                <dd>{formatDateTime(new Date())}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
