"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Result, Spin } from "antd";
import { LogoutButton } from "@/components/auth/auth-gate";
import { useIdentity, useSessionRecovery } from "@/hooks/use-auth-session";
import { ROLE_LABELS } from "@/lib/constants/auth";
import { ROUTES } from "@/lib/constants/routes";

export function WorkspaceAccessDenied() {
  return (
    <Result
      status="403"
      title="Không có quyền truy cập"
      subTitle="Workspace này không thuộc vai trò của tài khoản đang đăng nhập."
      extra={
        <>
          <Link href={ROUTES.DASHBOARD}>Về dashboard của tôi</Link>
          <LogoutButton />
        </>
      }
    />
  );
}

export function SessionError() {
  const router = useRouter();
  return (
    <Result
      status="warning"
      title="Không thể xác minh phiên đăng nhập"
      subTitle="Vui lòng kiểm tra kết nối và thử lại."
      extra={
        <>
          <Button onClick={() => router.refresh()}>Thử lại</Button>
          <LogoutButton />
        </>
      }
    />
  );
}

export function SessionRecovery() {
  const failed = useSessionRecovery();
  return failed ? (
    <SessionError />
  ) : (
    <main className="flex min-h-screen items-center justify-center">
      <Spin aria-label="Đang khôi phục phiên" />
    </main>
  );
}

export function UnsupportedWorkspace() {
  const user = useIdentity();
  return (
    <Result
      status="info"
      title="Workspace chưa được hỗ trợ"
      subTitle="Tài khoản đã được xác thực nhưng vai trò này chưa có workspace trong đợt triển khai hiện tại."
      extra={
        <>
          <p data-testid="identity-role">{ROLE_LABELS[user.role]}</p>
          <LogoutButton />
        </>
      }
    />
  );
}
