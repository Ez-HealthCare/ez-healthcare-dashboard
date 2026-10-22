"use client";

import { Button, Empty, Input, Modal, Segmented, Spin, Tag, message } from "antd";
import { useMemo, useState } from "react";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import type { AppointmentStatus, ReceptionAppointment } from "@/lib/types/clinical";
import styles from "./reception-appointments.module.css";

const statusText: Record<AppointmentStatus, string> = {
  BOOKED: "Đã đặt lịch",
  CHECKED_IN: "Đã check-in",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Không đến",
};

const filters: Array<{ label: string; value: "ALL" | AppointmentStatus }> = [
  { label: "Tất cả", value: "ALL" },
  { label: "Chờ check-in", value: "BOOKED" },
  { label: "Đã check-in", value: "CHECKED_IN" },
  { label: "Đã hủy", value: "CANCELLED" },
  { label: "Không đến", value: "NO_SHOW" },
];

function time(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value)
  );
}

function date(value?: string) {
  return value
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value))
    : "Chưa cập nhật";
}

export function ReceptionAppointments() {
  const appointments = useClinicalData(clinicalActions.receptionAppointments);
  const [filter, setFilter] = useState<"ALL" | AppointmentStatus>("ALL");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReceptionAppointment>();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);
  const [toast, context] = message.useMessage();

  const rows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("vi-VN");
    return (appointments.data || []).filter((appointment) => {
      const matchStatus = filter === "ALL" || appointment.status === filter;
      const matchTerm =
        !term ||
        [appointment.appointmentCode, appointment.patient.name, appointment.patient.nationalId]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("vi-VN")
          .includes(term);
      return matchStatus && matchTerm;
    });
  }, [appointments.data, filter, query]);

  const booked = (appointments.data || []).filter((item) => item.status === "BOOKED").length;
  const checkedIn = (appointments.data || []).filter((item) => item.status === "CHECKED_IN").length;

  const checkIn = async (appointment: ReceptionAppointment) => {
    try {
      setActing(true);
      const result = await clinicalActions.checkInAppointment(appointment.id);
      toast.success(`Đã check-in ${appointment.patient.name} · số ${result.hallTicketNumber}.`);
      setSelected(undefined);
      await appointments.refresh();
    } catch (error) {
      toast.error(clinicalErrorMessage(error));
    } finally {
      setActing(false);
    }
  };

  const cancel = async () => {
    if (!selected || !reason.trim()) return;
    try {
      setActing(true);
      await clinicalActions.cancelAppointment(selected.id, reason.trim());
      toast.success(`Đã hủy lịch ${selected.appointmentCode}.`);
      setCancelOpen(false);
      setReason("");
      setSelected(undefined);
      await appointments.refresh();
    } catch (error) {
      toast.error(clinicalErrorMessage(error));
    } finally {
      setActing(false);
    }
  };

  return (
    <section className={styles.workspace} aria-label="Lịch hẹn tiếp nhận">
      {context}
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Tiếp nhận · Lịch hẹn trong ngày</span>
          <h2>Lịch hẹn</h2>
          <p>Kiểm tra hồ sơ, xác nhận người bệnh đến quầy và phát số tiếp nhận.</p>
        </div>
        <div className={styles.metrics}>
          <div>
            <strong>{booked}</strong>
            <span>Chờ check-in</span>
          </div>
          <div>
            <strong>{checkedIn}</strong>
            <span>Đã check-in</span>
          </div>
        </div>
      </header>

      {appointments.error ? (
        <p className={styles.error}>Không tải được lịch hẹn: {appointments.error}</p>
      ) : null}

      <section className={styles.card}>
        <div className={styles.toolbar}>
          <Segmented
            aria-label="Lọc trạng thái lịch hẹn"
            onChange={(value) => setFilter(value as "ALL" | AppointmentStatus)}
            options={filters}
            value={filter}
          />
          <Input
            aria-label="Tìm lịch hẹn"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Mã lịch hẹn, họ tên hoặc CCCD"
            value={query}
          />
        </div>

        {appointments.loading ? (
          <div className={styles.loading}>
            <Spin />
          </div>
        ) : rows.length ? (
          <div className={styles.list}>
            {rows.map((appointment) => (
              <article className={styles.row} key={appointment.id}>
                <time className={styles.time}>{time(appointment.scheduledAt)}</time>
                <div className={styles.patient}>
                  <strong>{appointment.patient.name}</strong>
                  <span>
                    {appointment.appointmentCode} ·{" "}
                    {appointment.department?.name || "Chưa phân phòng"}
                  </span>
                </div>
                <p>{appointment.chiefComplaint || "Chưa ghi nhận lý do khám"}</p>
                <Tag className={`${styles.tag} ${styles[appointment.status]}`}>
                  {statusText[appointment.status]}
                </Tag>
                <Button onClick={() => setSelected(appointment)}>Xem hồ sơ</Button>
              </article>
            ))}
          </div>
        ) : (
          <Empty description="Không có lịch hẹn phù hợp" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </section>

      <Modal
        footer={null}
        onCancel={() => setSelected(undefined)}
        open={!!selected && !cancelOpen}
        title="Xác minh lịch hẹn"
      >
        {selected ? (
          <div className={styles.detail}>
            <div className={styles.identity}>
              <span>{selected.patient.name.slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{selected.patient.name}</strong>
                <small>
                  {selected.appointmentCode} · {time(selected.scheduledAt)}
                </small>
              </div>
              <Tag className={`${styles.tag} ${styles[selected.status]}`}>
                {statusText[selected.status]}
              </Tag>
            </div>
            <dl>
              <div>
                <dt>Ngày sinh</dt>
                <dd>{date(selected.patient.dateOfBirth)}</dd>
              </div>
              <div>
                <dt>CCCD</dt>
                <dd>{selected.patient.nationalId || "Chưa có"}</dd>
              </div>
              <div>
                <dt>BHYT</dt>
                <dd>{selected.patient.insuranceCardNumber || "Chưa có"}</dd>
              </div>
              <div>
                <dt>Phòng dự kiến</dt>
                <dd>{selected.department?.name || "Chưa phân phòng"}</dd>
              </div>
            </dl>
            <p className={styles.complaint}>
              <strong>Lý do khám</strong>
              {selected.chiefComplaint || "Chưa ghi nhận"}
            </p>
            {selected.status === "BOOKED" ? (
              <div className={styles.actions}>
                <Button danger disabled={acting} onClick={() => setCancelOpen(true)}>
                  Hủy lịch
                </Button>
                <Button loading={acting} onClick={() => void checkIn(selected)} type="primary">
                  Check-in & cấp số
                </Button>
              </div>
            ) : null}
            {selected.status === "CHECKED_IN" ? (
              <p className={styles.done}>
                Đã check-in lúc {time(selected.checkedInAt || selected.scheduledAt)}.
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        cancelText="Quay lại"
        okButtonProps={{ danger: true, disabled: !reason.trim(), loading: acting }}
        okText="Xác nhận hủy lịch"
        onCancel={() => setCancelOpen(false)}
        onOk={() => void cancel()}
        open={cancelOpen}
        title="Hủy lịch hẹn"
      >
        <p>Nhập lý do để lưu vào nhật ký tiếp nhận.</p>
        <Input.TextArea
          autoFocus
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          value={reason}
        />
      </Modal>
    </section>
  );
}
