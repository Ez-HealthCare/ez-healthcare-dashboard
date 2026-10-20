"use client";

import Image from "next/image";
import Link from "next/link";
import { Empty, Popover } from "antd";
import { LogoutButton } from "@/components/auth/auth-gate";
import { WorkspaceAccessDenied } from "@/components/auth/workspace-state";
import { useIdentity } from "@/hooks/use-auth-session";
import { WORKSPACES, canAccessWorkspace } from "@/lib/constants/workspaces";
import type { Workspace } from "@/lib/constants/workspaces";
import styles from "./role-workspace.module.css";
import { StaffClinicalPanel } from "@/components/clinical/staff-clinical-panel";

export function RoleWorkspace({
  workspace,
  section,
}: {
  workspace: Exclude<Workspace, "patient">;
  section: string;
}) {
  const user = useIdentity();
  const config = WORKSPACES[workspace];
  if (!canAccessWorkspace(user.role, workspace)) return <WorkspaceAccessDenied />;
  const title = config.navigation.find(([key]) => key === section)?.[1] || config.label;
  const name = user.name || user.email;
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#workspace-content">
        Bỏ qua điều hướng
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link
            href={config.path}
            className={styles.brand}
            aria-label="MediRoute — Trang chủ workspace"
          >
            <span className={styles.logo}>
              <Image src="/login/brand-mark.svg" alt="" width={18} height={18} />
            </span>
            <span>
              MediRoute<small>EMR PORTAL</small>
            </span>
          </Link>
          <nav className={styles.navigation} aria-label="Điều hướng workspace">
            {config.navigation.map(([key, label]) => (
              <Link
                key={key}
                href={config.path + (key ? "/" + key : "")}
                aria-current={section === key ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Popover
            trigger="click"
            placement="bottomRight"
            content={
              <div className={styles.account}>
                <strong>{name}</strong>
                <p>{user.email}</p>
                <p>{config.label}</p>
                <LogoutButton />
              </div>
            }
          >
            <button className={styles.profile} aria-label="Tài khoản của tôi">
              <span>
                <strong>{name}</strong>
                <small data-testid="identity-role">{config.label}</small>
              </span>
              <span className={styles.avatar} aria-hidden="true">
                {name.slice(0, 1).toUpperCase()}
              </span>
            </button>
          </Popover>
        </div>
      </header>
      <main id="workspace-content" className={styles.main}>
        <div className={styles.welcome}>
          <span className={styles.badge}>Không gian {config.label}</span>
          <h1>{title}</h1>
          <p>
            Xin chào, {name}. {config.description}
          </p>
        </div>
        {workspace === "nurse" || workspace === "doctor" ? (
          <section className={styles.placeholder} style={{ display: "block" }}>
            <StaffClinicalPanel workspace={workspace} />
          </section>
        ) : section === "" ? (
          <section className={styles.cards} aria-label="Chức năng theo vai trò">
            {config.navigation
              .filter(([key]) => key !== "")
              .map(([key, label]) => (
                <Link key={key} href={config.path + "/" + key} className={styles.card}>
                  <span className={styles.tile} aria-hidden="true">
                    ↗
                  </span>
                  <h2>{label}</h2>
                  <p>Mở không gian {label.toLocaleLowerCase("vi-VN")}</p>
                  <span className={styles.status}>Chưa kết nối nghiệp vụ</span>
                </Link>
              ))}
          </section>
        ) : (
          <section className={styles.placeholder}>
            <Empty description={`${title} đang được chuẩn bị — chưa kết nối API nghiệp vụ.`} />
            <Link href={config.path}>Quay lại bàn làm việc →</Link>
          </section>
        )}
      </main>
      <footer className={styles.footer}>
        MediRoute EMR · {config.label}
        <span>Điều hướng theo tài khoản đã xác thực</span>
      </footer>
    </div>
  );
}
