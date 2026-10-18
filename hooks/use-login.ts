"use client";

import { OTP_RESEND_DELAY_MS } from "@/lib/constants/auth";
import { ROUTES } from "@/lib/constants/routes";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";

export interface LoginFormValues {
  email: string;
  password?: string;
  otpCode?: string;
  remember?: boolean;
}

export function useLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"patient" | "staff">("patient");
  const [otpEmail, setOtpEmail] = useState("");
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    let active = true;
    void authService
      .getCurrentUser()
      .then(() => {
        if (active) router.replace(ROUTES.DASHBOARD);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  const requestOtp = async (email: string) => {
    await authService.requestPatientOtp(email);
    setOtpEmail(email);
    setRetryAt(Date.now() + OTP_RESEND_DELAY_MS);
  };

  const submit = async (values: LoginFormValues) => {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");
    try {
      const email = values.email.trim().toLowerCase();
      if (mode === "patient" && !otpEmail) {
        await requestOtp(email);
        return;
      }
      const rememberMe = values.remember === true;
      if (mode === "staff") {
        if (!values.password) throw new Error("Vui lòng nhập mật khẩu.");
        await authService.loginStaff({ email, password: values.password, rememberMe });
      } else {
        if (!values.otpCode) throw new Error("Vui lòng nhập mã OTP.");
        await authService.verifyPatientOtp({
          email: otpEmail,
          otpCode: values.otpCode,
          rememberMe,
        });
      }
      await authService.getCurrentUser();
      router.replace(ROUTES.DASHBOARD);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Đăng nhập thất bại.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const resendOtp = async (): Promise<boolean> => {
    if (submitting.current || secondsLeft > 0) return false;
    submitting.current = true;
    setLoading(true);
    setError("");
    try {
      await requestOtp(otpEmail);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể gửi lại mã.");
      return false;
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const resetOtp = () => {
    setOtpEmail("");
    setError("");
  };
  const changeMode = (nextMode: "patient" | "staff") => {
    setMode(nextMode);
    resetOtp();
  };
  return { loading, mode, otpEmail, error, secondsLeft, submit, resendOtp, resetOtp, changeMode };
}
