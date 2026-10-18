"use client";

import { SESSION_CHECK_INTERVAL_MS } from "@/lib/constants/auth";
import { ROUTES } from "@/lib/constants/routes";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthError, type UserProfile } from "@/lib/auth";
import { authService } from "@/services/auth.service";

export const IdentityContext = createContext<UserProfile | null>(null);

export function useIdentity() {
  const user = useContext(IdentityContext);
  if (!user) throw new Error("Identity must be used within AuthGate");
  return user;
}

export function useAuthSession(initialUser: UserProfile | null = null) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const verify = useCallback(() => {
    return authService
      .getCurrentUser()
      .then((identity) => {
        if (!mounted.current) return;
        setUser(identity);
        setError("");
      })
      .catch((error: unknown) => {
        if (!mounted.current) return;
        setUser(null);
        if (error instanceof AuthError && error.status === 401) {
          router.replace(ROUTES.LOGIN);
          router.refresh();
        } else {
          setError(error instanceof Error ? error.message : "Không thể kiểm tra phiên đăng nhập.");
        }
      });
  }, [router]);

  useEffect(() => {
    mounted.current = true;
    void verify();
    const checkVisible = () => {
      if (document.visibilityState === "visible") void verify();
    };
    const timer = window.setInterval(checkVisible, SESSION_CHECK_INTERVAL_MS);
    window.addEventListener("focus", checkVisible);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", checkVisible);
    };
  }, [verify]);

  return { user, error, verify };
}

export function useLogout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const logout = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");
    try {
      await authService.logout();
      // Full navigation drops identity and the previous in-memory page cache.
      window.location.replace(ROUTES.LOGIN);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Đăng xuất thất bại.");
      setLoading(false);
      submitting.current = false;
    }
  };
  return { loading, error, logout };
}

export function useSessionRecovery() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void authService
      .getCurrentUser()
      .then(() => {
        if (active) router.refresh();
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof AuthError && error.status === 401) router.replace(ROUTES.LOGIN);
        else setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [router]);
  return failed;
}
