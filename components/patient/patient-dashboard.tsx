"use client";

import { useEffect, useRef, useState } from "react";
import { PATIENT_THEME } from "@/lib/constants/theme";
import Image from "next/image";
import Link from "next/link";
import { Alert, Button, ConfigProvider, Popover } from "antd";
import { PatientRecords } from "./patient-records";
import { PatientNotifications } from "./patient-notifications";
import { PatientIcon } from "./patient-icon";
import { LogoutButton } from "@/components/auth/auth-gate";
import { WorkspaceAccessDenied } from "@/components/auth/workspace-state";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { useIdentity } from "@/hooks/use-auth-session";
import { PATIENT_NAVIGATION, ROUTES } from "@/lib/constants/routes";
import styles from "./patient-dashboard.module.css";
import { useReceptionLive } from "@/hooks/use-reception-live";
import { PatientVisitFlow } from "./patient-journey";
import { PatientProfilePage } from "./patient-profile";
import { ReceptionRequestFormPage } from "./reception-request-form";

export function PatientDashboard({ tab }: { tab: string }) {
  const user = useIdentity();
  const visit = useClinicalData(clinicalActions.currentVisit, 5_000, true);
  useReceptionLive(user.role === "PATIENT", visit.refresh);
  const receptionRequest = useClinicalData(clinicalActions.currentReceptionRequest, 8_000);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const accountLink = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!accountOpen) return;
    const frame = requestAnimationFrame(() => accountLink.current?.focus());
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setAccountOpen(false);
        accountTrigger.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", close);
    };
  }, [accountOpen]);
  if (user.role !== "PATIENT") return <WorkspaceAccessDenied />;
  const name = user.name || user.email;

  return (
    <ConfigProvider theme={PATIENT_THEME}>
      <div className={styles.page} data-workspace="patient">
        <a href="#patient-content" className={styles.skipLink}>
          Bỏ qua điều hướng
        </a>
        <header className={styles.header}>
          <div className={styles.headerInner} data-layout="container" data-part="header">
            <Link href={ROUTES.PATIENT} className={styles.brand}>
              <span className={styles.logo}>
                <Image src="/login/brand-mark.svg" alt="" width={18} height={18} />
              </span>
              <span>ezHealthcare</span>
            </Link>
            <nav className={styles.navigation} aria-label="Điều hướng bệnh nhân">
              {PATIENT_NAVIGATION.map(([key, label]) => (
                <Link
                  key={key}
                  href={ROUTES.PATIENT + (key ? "/" + key : "")}
                  aria-current={tab === key ? "page" : undefined}
                >
                  <PatientIcon
                    name={key === "records" ? "records" : key === "visits" ? "map" : "building"}
                  />
                  {key === "visits" ? "Lượt khám" : key === "records" ? "Hồ sơ" : label}
                </Link>
              ))}
            </nav>
            <div className={styles.headerActions}>
              <PatientNotifications
                open={notificationsOpen}
                onOpenChange={(open) => {
                  setNotificationsOpen(open);
                  if (open) setAccountOpen(false);
                }}
              />
              <Popover
                open={accountOpen}
                onOpenChange={(open) => {
                  setAccountOpen(open);
                  if (open) setNotificationsOpen(false);
                }}
                classNames={{ root: styles.accountPopover }}
                getPopupContainer={(trigger) => trigger.parentElement!}
                trigger="click"
                placement="bottomRight"
                content={
                  <div
                    className={styles.account}
                    id="patient-account-menu"
                    role="dialog"
                    aria-label="Thông tin tài khoản"
                    onBlur={(event) => {
                      if (
                        event.relatedTarget &&
                        !event.currentTarget.contains(event.relatedTarget as Node)
                      )
                        setAccountOpen(false);
                    }}
                  >
                    <div className={styles.accountIdentity}>
                      <span className={styles.accountAvatar} aria-hidden="true">
                        {name[0]?.toUpperCase()}
                      </span>
                      <div className={styles.accountDetails}>
                        <strong>{name}</strong>
                        <p>{user.email}</p>
                        <span className={styles.accountRole} data-testid="identity-role">
                          Bệnh nhân
                        </span>
                      </div>
                    </div>
                    <Link
                      href={ROUTES.PATIENT_PROFILE}
                      ref={accountLink}
                      className={styles.accountLink}
                      onClick={() => setAccountOpen(false)}
                    >
                      <PatientIcon name="user" />
                      Hồ sơ cá nhân
                    </Link>
                    <div className={styles.accountLogout}>
                      <LogoutButton />
                    </div>
                  </div>
                }
              >
                <button
                  ref={accountTrigger}
                  className={styles.profile}
                  aria-haspopup="dialog"
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
                requestLoading={receptionRequest.loading}
                requestError={receptionRequest.error}
                onRefresh={async () => {
                  await Promise.all([visit.refresh(), receptionRequest.refresh()]);
                }}
                patientName={name}
              />
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
            © {new Date().getFullYear()} ezHealthcare · Cổng bệnh nhân
          </div>
        </footer>
      </div>
    </ConfigProvider>
  );
}
