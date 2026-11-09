"use client";

import { formatDateTime } from "@/lib/display-format";

import { useRef, useState } from "react";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import { PATIENT_THEME } from "@/lib/constants/theme";
import Image from "next/image";
import Link from "next/link";
import { Alert, Button, ConfigProvider, List, Popover, message } from "antd";
import { PatientRecords } from "./patient-records";
import { PatientIcon } from "./patient-icon";
import { patientRecordLink } from "@/lib/visit-status";
import { LogoutButton } from "@/components/auth/auth-gate";
import { WorkspaceAccessDenied } from "@/components/auth/workspace-state";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { useIdentity } from "@/hooks/use-auth-session";
import { PATIENT_NAVIGATION, ROUTES } from "@/lib/constants/routes";
import styles from "./patient-dashboard.module.css";
import { PatientVisitFlow } from "./patient-journey";
import { PatientProfilePage } from "./patient-profile";
import { ReceptionRequestFormPage } from "./reception-request-form";

export function PatientDashboard({ tab }: { tab: string }) {
  const user = useIdentity();
  const visit = useClinicalData(clinicalActions.currentVisit);
  const receptionRequest = useClinicalData(clinicalActions.currentReceptionRequest, 8_000);
  const notifications = useClinicalData(clinicalActions.notifications, 8_000);
  const [, context] = message.useMessage();
  const readLock = useRef(false);
  const [readBusy, setReadBusy] = useState(false);
  const [readError, setReadError] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
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
                open={accountOpen}
                onOpenChange={setAccountOpen}
                trigger="click"
                placement="bottomRight"
                content={
                  <div className={styles.account} id="patient-account-menu">
                    <strong>{name}</strong>
                    <p>{user.email}</p>
                    <p data-testid="identity-role">Bệnh nhân</p>
                    <Link
                      href={ROUTES.PATIENT_PROFILE}
                      className={styles.accountLink}
                      onClick={() => setAccountOpen(false)}
                    >
                      <PatientIcon name="user" />
                      Hồ sơ cá nhân
                    </Link>
                    <LogoutButton />
                  </div>
                }
              >
                <button
                  className={styles.profile}
                  aria-label="Tài khoản bệnh nhân"
                  aria-expanded={accountOpen}
                  aria-controls={accountOpen ? "patient-account-menu" : undefined}
                >
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
        <main
          id="patient-content"
          className={styles.main}
          data-layout="container"
          data-part="main"
          data-tab={tab || "home"}
        >
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
                      ? "Hồ sơ cá nhân"
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
              {visit.error && visit.data && (
                <Alert
                  type="error"
                  showIcon
                  title="Không tải được lượt khám"
                  description={visit.error}
                  action={<Button onClick={() => void visit.refresh()}>Thử lại</Button>}
                />
              )}
              <PatientVisitFlow
                key={visit.data?.visitId || "no-visit"}
                visit={visit.data}
                loading={visit.loading}
                error={visit.error}
                requestStatus={receptionRequest.data?.status}
                onRefresh={visit.refresh}
              >
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
              </PatientVisitFlow>
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
                    <h2>Hồ sơ cá nhân</h2>
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
