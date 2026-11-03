"use client";

import { formatDateTime } from "@/lib/display-format";

import { useRef, useState } from "react";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import { PATIENT_THEME } from "@/lib/constants/theme";
import Image from "next/image";
import Link from "next/link";
import { Alert, Button, ConfigProvider, List, Popover, Spin, message } from "antd";
import { PatientRecords } from "./patient-records";
import { PatientIcon } from "./patient-icon";
import { isFinalVisit, patientRecordLink, visitStatusLabel } from "@/lib/visit-status";
import { useRouter } from "next/navigation";
import { LogoutButton } from "@/components/auth/auth-gate";
import { WorkspaceAccessDenied } from "@/components/auth/workspace-state";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { useIdentity } from "@/hooks/use-auth-session";
import { PATIENT_NAVIGATION, ROUTES } from "@/lib/constants/routes";
import styles from "./patient-dashboard.module.css";
import { PatientReturnNotice } from "./patient-return-notice";
import { PatientProfilePage } from "./patient-profile";
import { ReceptionRequestFormPage } from "./reception-request-form";

export function PatientDashboard({ tab }: { tab: string }) {
  const router = useRouter();
  const user = useIdentity();
  const visit = useClinicalData(clinicalActions.currentVisit);
  const receptionRequest = useClinicalData(clinicalActions.currentReceptionRequest, 8_000);
  const notifications = useClinicalData(clinicalActions.notifications, 8_000);
  const [, context] = message.useMessage();
  const readLock = useRef(false);
  const [readBusy, setReadBusy] = useState(false);
  const [readError, setReadError] = useState("");
  if (user.role !== "PATIENT") return <WorkspaceAccessDenied />;
  const name = user.name || user.email;

  return (
    <ConfigProvider theme={PATIENT_THEME}>
      <div className={styles.page} data-workspace="patient">
        {context}
        <a href="#patient-content" className={styles.skipLink}>
          Bỏ qua điều hướng
        </a>
        <header className={styles.header}>
          <div className={styles.headerInner} data-layout="container" data-part="header">
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
              <Link
                href={`${ROUTES.PATIENT}#notifications`}
                className={styles.iconButton}
                aria-label="Thông báo"
              >
                <PatientIcon name="bell" />
                {(notifications.data || []).some((item) => !item.readAt) && (
                  <span className={styles.unreadDot} />
                )}
              </Link>
              <Popover
                trigger="click"
                placement="bottomRight"
                content={
                  <div className={styles.account}>
                    <strong>{name}</strong>
                    <p>{user.email}</p>
                    <p data-testid="identity-role">Bệnh nhân</p>
                    <Link href={ROUTES.PATIENT_PROFILE}>Thông tin cá nhân</Link>
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
        <main id="patient-content" className={styles.main} data-layout="container" data-part="main">
          {tab === "" ? (
            <div className={styles.welcome}>
              <div>
                <div className={styles.eyebrow}>
                  <span className={styles.activeBadge}>Cổng người bệnh</span>
                </div>
                <h1>Xin chào, {name}</h1>
                <p>Theo dõi lượt khám, nhận thông báo và xem lại hồ sơ của bạn.</p>
              </div>
            </div>
          ) : (
            <div className={styles.breadcrumb}>
              <Link href={ROUTES.PATIENT}>Trang chủ</Link>
              <span aria-hidden="true">/</span>
              <span>
                {tab === "records"
                  ? "Hồ sơ khám bệnh"
                  : tab === "visits"
                    ? "Lượt khám của tôi"
                    : tab === "profile"
                      ? "Thông tin cá nhân"
                      : "Yêu cầu tiếp nhận"}
              </span>
            </div>
          )}
          {tab === "reception-request" ? (
            <ReceptionRequestFormPage />
          ) : tab === "profile" ? (
            <PatientProfilePage />
          ) : tab === "visits" || tab === "records" ? (
            <PatientRecords key={tab} completedOnly={tab === "records"} />
          ) : (
            <>
              {!visit.data && receptionRequest.data?.status === "RECEPTION_PENDING" && (
                <Alert
                  type="info"
                  showIcon
                  title="Yêu cầu tiếp nhận đang chờ duyệt"
                  description="Lễ tân sẽ kiểm tra yêu cầu và cấp số tiếp nhận. Sau khi có số, vui lòng chờ gọi đến quầy để đối chiếu CCCD/BHYT."
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
              <div className={styles.dashboardGrid}>
                <section className={styles.visit} aria-label="Lượt khám hiện tại">
                  <div className={styles.visitBody}>
                    <div className={styles.visitBadges}>
                      <span className={styles.visitBadge}>Lượt khám hôm nay</span>
                      <span className={styles.pendingBadge}>
                        {visit.data
                          ? visit.data.status === "HALL_WAITING" &&
                            visit.data.ticketStatus === "CALLED"
                            ? "Đã được gọi đến quầy tiếp nhận"
                            : visitStatusLabel(visit.data.status)
                          : "Chưa có số tiếp nhận"}
                      </span>
                    </div>
                    {visit.loading ? (
                      <Spin />
                    ) : visit.data ? (
                      <>
                        {visit.data.ticketStatus === "EXPIRED" &&
                          !isFinalVisit(visit.data.status) && (
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
                        {visit.data.status === "COMPLETED" ? (
                          <Alert
                            type="success"
                            showIcon
                            title="Bác sĩ đã lưu kết luận và đơn thuốc"
                            description="Bạn có thể xem lại chi tiết, lời dặn và lịch tái khám trong Hồ sơ khám bệnh."
                          />
                        ) : visit.data.status === "PARACLINICAL_PENDING" ? (
                          <p>
                            Vui lòng thực hiện các chỉ định CLS. Khi đủ kết quả, bạn sẽ quay lại
                            phòng khám để tái khám.
                          </p>
                        ) : visit.data.status === "RE_EXAM_CALLING" ? (
                          <p>
                            Đã có đủ kết quả CLS. Vui lòng quay lại phòng khám và chờ bác sĩ tiếp
                            nhận tái khám.
                          </p>
                        ) : visit.data.status === "TRIAGE_PENDING" ? (
                          <p>
                            Đã tiếp nhận hồ sơ - Vui lòng chờ điều dưỡng gọi vào phòng sàng lọc đo
                            sinh hiệu
                          </p>
                        ) : visit.data.status === "CLINIC_WAITING" ? (
                          <p>Vui lòng di chuyển đến trước cửa phòng khám và theo dõi số thứ tự.</p>
                        ) : visit.data.status === "HALL_WAITING" ? (
                          <p>Vui lòng chờ lễ tân gọi đến quầy tiếp nhận để xác minh.</p>
                        ) : null}
                        <PatientReturnNotice
                          key={
                            visit.data.visitId +
                            "-" +
                            (visit.data.returnReportedAt || visit.data.status)
                          }
                          visit={visit.data}
                          onRefresh={visit.refresh}
                        />
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
                        <p>Tạo yêu cầu tiếp nhận để được lễ tân kiểm tra và cấp số.</p>
                      </>
                    )}
                  </div>
                  <aside className={styles.queue}>
                    <span className={styles.actionLabel}>Việc cần làm</span>
                    {visit.data && isFinalVisit(visit.data.status) ? (
                      <Link href={patientRecordLink(visit.data.visitId)}>
                        <Button type="primary" block>
                          {visit.data.status === "COMPLETED"
                            ? "Xem kết luận & Đơn thuốc"
                            : "Xem hồ sơ lượt khám"}
                        </Button>
                      </Link>
                    ) : visit.data ? (
                      <>
                        <p>Xem thông tin và hướng dẫn cho lượt khám hiện tại.</p>
                        <Link href={patientRecordLink(visit.data.visitId)}>
                          <Button type="primary" block>
                            Xem lượt khám
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Button
                          type="primary"
                          block
                          disabled={!!visit.data || visit.loading}
                          onClick={() => router.push(ROUTES.PATIENT_RECEPTION_REQUEST)}
                        >
                          Tạo yêu cầu tiếp nhận
                        </Button>
                        {visit.data && (
                          <p>
                            Bạn đang có lượt khám. Theo dõi lượt hiện tại trước khi tạo yêu cầu mới.
                          </p>
                        )}
                      </>
                    )}
                  </aside>
                </section>
                <section className={styles.card} id="notifications">
                  <div className={styles.sectionHeading}>
                    <h2>Thông báo</h2>
                    <button
                      className={styles.textButton}
                      disabled={
                        readBusy || !(notifications.data || []).some((item) => !item.readAt)
                      }
                      onClick={async () => {
                        if (readLock.current) return;
                        readLock.current = true;
                        setReadBusy(true);
                        setReadError("");
                        try {
                          await clinicalActions.markAllRead();
                          await notifications.refresh();
                        } catch (error) {
                          setReadError(clinicalErrorMessage(error));
                        } finally {
                          readLock.current = false;
                          setReadBusy(false);
                        }
                      }}
                    >
                      {readBusy ? "Đang đánh dấu…" : "Đánh dấu đã đọc"}
                    </button>
                  </div>
                  {(readError || notifications.error) && (
                    <Alert
                      type="error"
                      showIcon
                      title="Chưa cập nhật được thông báo"
                      description={readError || notifications.error}
                      action={
                        <Button onClick={() => void notifications.refresh()}>
                          Thử lại tải danh sách
                        </Button>
                      }
                    />
                  )}
                  <List
                    pagination={{ pageSize: 4, hideOnSinglePage: true, size: "small" }}
                    loading={notifications.loading}
                    dataSource={notifications.data || []}
                    locale={{ emptyText: "Chưa có thông báo" }}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <span>
                              {item.title} · {item.readAt ? "Đã đọc" : "Chưa đọc"}
                            </span>
                          }
                          description={
                            <div className={styles.notificationContent}>
                              <p>{item.message}</p>
                              <time dateTime={item.createdAt}>
                                {formatDateTime(item.createdAt)}
                              </time>
                              {item.visitId && (
                                <Link
                                  className={styles.textButton}
                                  href={patientRecordLink(item.visitId)}
                                >
                                  {item.type === "VISIT_COMPLETED"
                                    ? "Xem kết luận & Đơn thuốc"
                                    : "Xem lượt khám liên quan"}
                                </Link>
                              )}
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </section>
              </div>
              <section className={styles.quickLinks} aria-label="Truy cập nhanh">
                <Link href={`${ROUTES.PATIENT}/visits`}>
                  <span className={styles.quickIcon}>
                    <PatientIcon name="ticket" />
                  </span>
                  <div>
                    <h2>Lượt khám của tôi</h2>
                    <p>Theo dõi trạng thái và thông tin lượt khám.</p>
                  </div>
                  <PatientIcon name="arrow" />
                </Link>
                <Link href={`${ROUTES.PATIENT}/records`}>
                  <span className={styles.quickIcon}>
                    <PatientIcon name="records" />
                  </span>
                  <div>
                    <h2>Hồ sơ khám bệnh</h2>
                    <p>Xem kết luận, đơn thuốc và lịch tái khám.</p>
                  </div>
                  <PatientIcon name="arrow" />
                </Link>
                <Link href={ROUTES.PATIENT_PROFILE}>
                  <span className={styles.quickIcon}>
                    <PatientIcon name="user" />
                  </span>
                  <div>
                    <h2>Thông tin cá nhân</h2>
                    <p>Cập nhật thông tin tiếp nhận và dị ứng.</p>
                  </div>
                  <PatientIcon name="arrow" />
                </Link>
              </section>
            </>
          )}
        </main>
        <footer className={styles.footer}>
          <div data-layout="container" data-part="footer">
            © {new Date().getFullYear()} MediRoute EMR · Cổng bệnh nhân
          </div>
        </footer>
      </div>
    </ConfigProvider>
  );
}
