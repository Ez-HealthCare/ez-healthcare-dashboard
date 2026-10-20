"use client";

import Image from "next/image";
import Link from "next/link";
import { Alert, Button, Empty, List, Modal, Popover, Spin, message } from "antd";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/auth-gate";
import { WorkspaceAccessDenied } from "@/components/auth/workspace-state";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { useIdentity } from "@/hooks/use-auth-session";
import { PATIENT_NAVIGATION, ROUTES } from "@/lib/constants/routes";
import styles from "./patient-dashboard.module.css";
import { clinicalErrorMessage } from "@/lib/clinical-error";

const statusText: Record<string, string> = {
  HALL_WAITING: "Đang chờ tiếp nhận",
  RECEPTION_VERIFIED: "Đã xác minh thông tin",
  TRIAGE_PENDING: "Đang chờ phân phòng",
  CLINIC_WAITING: "Đang chờ khám",
  CLINIC_CALLED: "Đã được gọi vào phòng",
  TEMPORARILY_ABSENT: "Tạm vắng — liên hệ lễ tân",
  IN_EXAMINATION: "Bác sĩ đang tiếp nhận",
  EMERGENCY_DISPATCHED: "Đã chuyển cấp cứu",
};

export function PatientDashboard({ tab }: { tab: string }) {
  const user = useIdentity();
  const visit = useClinicalData(clinicalActions.currentVisit);
  const notifications = useClinicalData(clinicalActions.notifications, 8_000);
  const [toast, context] = message.useMessage();
  const [modal, modalContext] = Modal.useModal();
  const [taking, setTaking] = useState(false);
  if (user.role !== "PATIENT") return <WorkspaceAccessDenied />;
  const name = user.name || user.email;

  const takeNumber = async () => {
    if (taking) return;
    setTaking(true);
    try {
      await clinicalActions.requestHallTicket();
      await visit.refresh();
      await notifications.refresh();
      toast.success("Đã cấp số tiếp nhận.");
    } catch (error) {
      toast.error(clinicalErrorMessage(error));
    } finally {
      setTaking(false);
    }
  };
  const reissue = () =>
    modal.confirm({
      title: "Cấp lại số tiếp nhận?",
      content: "Số hiện tại sẽ mất hiệu lực và bạn sẽ chuyển xuống cuối hàng đợi.",
      okText: "Cấp số mới",
      cancelText: "Giữ số hiện tại",
      async onOk() {
        if (!visit.data) return;
        await clinicalActions.reissueHallTicket(visit.data.visitId);
        await visit.refresh();
        await notifications.refresh();
      },
    });

  return (
    <div className={styles.page}>
      {context}
      {modalContext}
      <a href="#patient-content" className={styles.skipLink}>
        Bỏ qua điều hướng
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href={ROUTES.PATIENT} className={styles.brand}>
            <span className={styles.logo}>
              <Image src="/login/brand-mark.svg" alt="" width={18} height={18} />
            </span>
            <span>
              MediRoute<small>EMR PORTAL</small>
            </span>
          </Link>
          <nav className={styles.navigation} aria-label="Điều hướng bệnh nhân">
            {PATIENT_NAVIGATION.map(([key, label]) => (
              <Link
                key={key}
                href={ROUTES.PATIENT + (key ? "/" + key : "")}
                aria-current={tab === key ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className={styles.headerActions}>
            <Popover
              trigger="click"
              placement="bottomRight"
              content={
                <div className={styles.account}>
                  <strong>{name}</strong>
                  <p>{user.email}</p>
                  <p data-testid="identity-role">Bệnh nhân</p>
                  <LogoutButton />
                </div>
              }
            >
              <button className={styles.profile} aria-label="Tài khoản bệnh nhân">
                <span className={styles.profileText}>
                  <strong>{name}</strong>
                  <small>Bệnh nhân</small>
                </span>
                <span className={styles.avatar}>{name[0]?.toUpperCase()}</span>
              </button>
            </Popover>
          </div>
        </div>
      </header>
      <main id="patient-content" className={styles.main}>
        <div className={styles.welcome}>
          <div>
            <div className={styles.eyebrow}>
              <span className={styles.activeBadge}>● Dữ liệu trực tiếp</span>
            </div>
            <h1>Xin chào, {name}</h1>
            <p>Chủ động lấy số tiếp nhận và theo dõi lượt khám hôm nay.</p>
          </div>
        </div>
        {tab !== "" ? (
          <section className={styles.placeholder}>
            <h2>{tab === "visits" ? "Lượt khám của tôi" : "Hồ sơ khám bệnh"}</h2>
            <Empty description="Chưa có dữ liệu trong phạm vi Phase B." />
            <Link href={ROUTES.PATIENT}>Quay lại trang chủ</Link>
          </section>
        ) : (
          <>
            {visit.error && (
              <Alert
                type="error"
                showIcon
                title="Không tải được lượt khám"
                description={visit.error}
              />
            )}
            <section className={styles.visit} aria-label="Lượt khám hiện tại">
              <div className={styles.visitBody}>
                <div className={styles.visitBadges}>
                  <span className={styles.visitBadge}>Lượt khám hôm nay</span>
                  <span className={styles.pendingBadge}>
                    {visit.data ? statusText[visit.data.status] : "Chưa lấy số"}
                  </span>
                </div>
                {visit.loading ? (
                  <Spin />
                ) : visit.data ? (
                  <>
                    {visit.data.ticketStatus === "EXPIRED" && (
                      <Alert
                        type="warning"
                        showIcon
                        title="Lượt đã hết hiệu lực"
                        description="Bạn không thể tự cấp lại. Vui lòng liên hệ lễ tân để được cấp số mới."
                        style={{ marginBottom: 16 }}
                      />
                    )}
                    <h2>Số tiếp nhận {visit.data.hallTicketNumber}</h2>
                    <p>
                      {visit.data.clinicTicketNumber
                        ? `Số khám ${visit.data.clinicTicketNumber}`
                        : "Điều dưỡng/lễ tân sẽ tiếp nhận và phân phòng sau khi xác minh."}
                    </p>
                    {visit.data.room && (
                      <div className={styles.notice}>
                        <p>
                          <strong>{visit.data.room.code}</strong> · {visit.data.room.name}
                        </p>
                      </div>
                    )}
                    {visit.data.canPatientReissue && (
                      <Button danger onClick={reissue}>
                        Cấp lại số tiếp nhận
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <h2>Bạn chưa có lượt khám hôm nay</h2>
                    <p>Lấy số trong khung 07:00–11:30 hoặc 13:00–16:30.</p>
                  </>
                )}
              </div>
              <aside className={styles.queue}>
                <Button
                  type="primary"
                  block
                  loading={taking}
                  disabled={!!visit.data || visit.loading || taking}
                  onClick={takeNumber}
                >
                  Lấy số tiếp nhận
                </Button>
              </aside>
            </section>
            <section className={styles.card} id="notifications">
              <div className={styles.sectionHeading}>
                <h2>Thông báo</h2>
                <button
                  className={styles.textButton}
                  onClick={async () => {
                    await clinicalActions.markAllRead();
                    await notifications.refresh();
                  }}
                >
                  Đánh dấu đã đọc
                </button>
              </div>
              <List
                loading={notifications.loading}
                dataSource={notifications.data || []}
                locale={{ emptyText: "Chưa có thông báo" }}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta title={item.title} description={item.message} />
                  </List.Item>
                )}
              />
            </section>
          </>
        )}
      </main>
      <footer className={styles.footer}>© 2026 MediRoute EMR · Cổng bệnh nhân</footer>
    </div>
  );
}
