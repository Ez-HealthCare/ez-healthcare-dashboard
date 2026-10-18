"use client";

import type { ReactNode } from "react";
import type { UserProfile } from "@/lib/auth";
import { Alert, Button, Spin } from "antd";
import { IdentityContext, useAuthSession, useLogout } from "@/hooks/use-auth-session";

export function AuthGate({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser?: UserProfile;
}) {
  const { user, error, verify } = useAuthSession(initialUser);
  if (error) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <Alert title="Không thể xác minh đăng nhập" description={error} type="error" showIcon />
        <Button onClick={() => void verify()} className="mt-4">
          Thử lại
        </Button>
      </main>
    );
  }
  if (!user) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        aria-label="Đang kiểm tra đăng nhập"
      >
        <Spin size="large" />
      </main>
    );
  }
  return <IdentityContext value={user}>{children}</IdentityContext>;
}

export function LogoutButton() {
  const { loading, error, logout } = useLogout();
  return (
    <div>
      <Button size="small" aria-label="Đăng xuất" loading={loading} onClick={() => void logout()}>
        Đăng xuất
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
