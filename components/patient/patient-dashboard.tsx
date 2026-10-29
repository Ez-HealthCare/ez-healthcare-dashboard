"use client";

import Image from "next/image";
import Link from "next/link";
import { Alert, Button, Empty, List, Popover, Spin, message } from "antd";
import { useRouter } from "next/navigation";
import { LogoutButton } from "@/components/auth/auth-gate";
import { WorkspaceAccessDenied } from "@/components/auth/workspace-state";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { useIdentity } from "@/hooks/use-auth-session";
import { PATIENT_NAVIGATION, ROUTES } from "@/lib/constants/routes";
import styles from "./patient-dashboard.module.css";
import { PatientProfilePage } from "./patient-profile";
import { ReceptionRequestFormPage } from "./reception-request-form";

const statusText: Record<string, string> = {
  HALL_WAITING: "Đang chờ tiếp nhận",
  RECEPTION_VERIFIED: "Đã xác minh thông tin",
  TRIAGE_PENDING: "Đã tiếp nhận hồ sơ",
  CLINIC_WAITING: "Đã phân phòng khám",
  CLINIC_CALLED: "Đã được gọi vào phòng",
  TEMPORARILY_ABSENT: "Tạm vắng — liên hệ lễ tân",
  IN_EXAMINATION: "Bác sĩ đang tiếp nhận",
  EMERGENCY_DISPATCHED: "Đã chuyển cấp cứu",
};

export function PatientDashboard({ tab }: { tab: string }) {
  const router = useRouter();
  const user = useIdentity();
  const visit = useClinicalData(clinicalActions.currentVisit);
  const receptionRequest = useClinicalData(clinicalActions.currentReceptionRequest, 8_000);
  const notifications = useClinicalData(clinicalActions.notifications, 8_000);
  const [, context] = message.useMessage();
  if (user.role !== "PATIENT") return <WorkspaceAccessDenied />;
  const name = user.name || user.email;

  return (
    <div className={styles.page}>
      {context}
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
        {tab === "reception-request" ? (
          <ReceptionRequestFormPage />
        ) : tab === "profile" ? (
          <PatientProfilePage />
        ) : tab !== "" ? (
          <section className={styles.placeholder}>
            <h2>{tab === "visits" ? "Lượt khám của tôi" : "Hồ sơ khám bệnh"}</h2>
            <Empty description="Chưa có dữ liệu trong phạm vi Phase B." />
            <Link href={ROUTES.PATIENT}>Quay lại trang chủ</Link>
          </section>
        ) : (
          <>
            {!visit.data && receptionRequest.data?.status === "RECEPTION_PENDING" && (
              <Alert
                type="info"
                showIcon
                title="Yêu cầu tiếp nhận đang chờ xác minh"
                description="Vui lòng đến quầy tiếp nhận để đối chiếu CCCD/BHYT. Số tiếp nhận sẽ xuất hiện tại đây sau khi xác minh thành công."
              />
            )}
            {!visit.data && receptionRequest.data?.status === "DRAFT" && (
              <Alert
                type="warning"
                showIcon
                title="Bạn có yêu cầu tiếp nhận chưa gửi"
                description={
                  <Link href={ROUTES.PATIENT_RECEPTION_REQUEST}>Tiếp tục khai triệu chứng</Link>
                }
              />
            )}
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
                    {visit.data
                      ? visit.data.status === "HALL_WAITING" && visit.data.ticketStatus === "CALLED"
                        ? "Đã được gọi đến quầy tiếp nhận"
                        : statusText[visit.data.status]
                      : "Chưa có số tiếp nhận"}
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
                    <h2>
                      {visit.data.clinicTicketNumber
                        ? `Số khám ${visit.data.clinicTicketNumber}`
                        : `Số tiếp nhận ${visit.data.hallTicketNumber}`}
                    </h2>
                    {visit.data.status === "TRIAGE_PENDING" ? (
                      <p>
                        Đã tiếp nhận hồ sơ - Vui lòng chờ điều dưỡng gọi vào phòng sàng lọc đo sinh
                        hiệu
                      </p>
                    ) : visit.data.status === "CLINIC_WAITING" ? (
                      <p>Vui lòng di chuyển đến trước cửa phòng khám và theo dõi số thứ tự.</p>
                    ) : visit.data.status === "HALL_WAITING" ? (
                      <p>Vui lòng chờ lễ tân gọi đến quầy tiếp nhận để xác minh.</p>
                    ) : null}
                    {visit.data.room && (
                      <div className={styles.notice}>
                        <p>
                          <strong>{visit.data.room.code}</strong> · {visit.data.room.name}
                        </p>
                      </div>
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
                  disabled={!!visit.data || visit.loading}
                  onClick={() => router.push(ROUTES.PATIENT_RECEPTION_REQUEST)}
                >
                  Tạo yêu cầu tiếp nhận
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
