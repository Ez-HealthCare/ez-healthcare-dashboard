"use client";

import { STAFF_THEME } from "@/lib/constants/theme";
import Link from "next/link";
import { ConfigProvider, Drawer, Popover } from "antd";
import { LogoutButton } from "@/components/auth/auth-gate";
import { useIdentity } from "@/hooks/use-auth-session";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { WORKSPACES } from "@/lib/constants/workspaces";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { StaffNotifications } from "./staff-notifications";
import styles from "./staff-workspace-shell.module.css";

export function StaffWorkspaceShell({
  workspace,
  section,
  children,
  stationLabel,
}: {
  workspace: "nurse" | "receptionist" | "doctor";
  section: string;
  children: ReactNode;
  stationLabel?: string;
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const config = WORKSPACES[workspace];
  const station =
    stationLabel ||
    (workspace === "nurse"
      ? "Phòng sàng lọc 102"
      : workspace === "doctor"
        ? "Phòng khám bác sĩ"
        : "Quầy tiếp đón 02");
  const user = useIdentity();
  const notifications = useClinicalData(
    clinicalActions.notifications,
    workspace === "doctor" ? 5_000 : 30_000
  );
  const unread = (notifications.data || []).filter((item) => !item.readAt).length;
  const name = user.name || user.email;
  return (
    <ConfigProvider theme={STAFF_THEME}>
      <div className={styles.workspace} data-workspace="staff" data-role={workspace}>
        <a className={styles.skip} href="#workspace-content">
          Bỏ qua điều hướng
        </a>
        <header className={styles.header}>
          <div className={styles.headerInner} data-layout="container" data-part="header">
            <Link
              className={styles.brand}
              href={config.path}
              aria-label={`MediRoute — ${config.label}`}
            >
              <span className={styles.logo}>
                <Image src="/staff/brand-mark.svg" width={18} height={18} alt="" />
              </span>
              <span>
                MediRoute<small>EMR PORTAL</small>
              </span>
            </Link>
            <nav className={styles.navigation} aria-label={`Điều hướng ${config.label}`}>
              {config.navigation.map(([key, label]) => (
                <Link
                  key={key}
                  href={config.path + (key ? "/" + key : "")}
                  aria-current={section === key ? "page" : undefined}
                >
                  {workspace === "receptionist" && key === "" ? "Bàn tiếp nhận" : label}
                </Link>
              ))}
            </nav>
            <div className={styles.headerActions}>
              <span className={styles.roomPill}>
                <i />
                <span className={styles.stationText} title={station}>
                  {station}
                </span>
                <span>·</span>
                <strong>Hoạt động</strong>
              </span>
              <button
                className={styles.notificationButton}
                aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ""}`}
                aria-haspopup="dialog"
                aria-expanded={notificationsOpen}
                aria-controls="staff-notifications"
                onClick={() => setNotificationsOpen(true)}
              >
                <Image src="/staff/bell.svg" width={20} height={20} alt="" />
                {unread > 0 && <i />}
              </button>
              <Drawer
                title="Thông báo"
                open={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
                size="min(420px, 100vw)"
                rootClassName={styles.notificationDrawer}
              >
                <StaffNotifications
                  workspace={workspace}
                  data={notifications.data}
                  loading={notifications.loading}
                  error={notifications.error}
                  refresh={notifications.refresh}
                  onNavigate={() => setNotificationsOpen(false)}
                />
              </Drawer>
              <Popover
                trigger="click"
                placement="bottomRight"
                content={
                  <div className={styles.account}>
                    <strong>{name}</strong>
                    <p>{user.email}</p>
                    <LogoutButton />
                  </div>
                }
              >
                <button className={styles.profile} aria-label="Tài khoản của tôi">
                  <span>
                    <strong>{name}</strong>
                    <small data-testid="identity-role">{config.label}</small>
                  </span>
                  <span className={styles.avatar}>
                    <Image src="/staff/user.svg" width={12} height={12} alt="" />
                  </span>
                </button>
              </Popover>
            </div>
          </div>
        </header>
        <main
          id="workspace-content"
          className={styles.main}
          data-layout="container"
          data-part="main"
        >
          {children}
        </main>
        <footer className={styles.footer}>
          <div className={styles.footerInner} data-layout="container" data-part="footer">
            <span>
              © {new Date().getFullYear()} MediRoute EMR · {config.label} · {station}
            </span>
            <span>Hệ thống quản lý hành trình khám bệnh</span>
          </div>
        </footer>
      </div>
    </ConfigProvider>
  );
}
