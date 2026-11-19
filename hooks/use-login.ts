"use client";

import { OTP_RESEND_DELAY_MS } from "@/lib/constants/auth";
import { ROUTES } from "@/lib/constants/routes";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";

export type LoginView = "login" | "register" | "verify-otp";

export interface LoginFormValues {
  email: string;
  password?: string;
  otpCode?: string;
  remember?: boolean;
  name?: string;
  phone?: string;
  confirmPassword?: string;
}

export function useLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<LoginView>("login");
  const [mode, setMode] = useState<"patient" | "staff">("patient");
  const [otpEmail, setOtpEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const submitting = useRef(false);
  const pendingRegisterData = useRef<{
    name: string;
    phone: string;
    email: string;
    password: string;
  } | null>(null);

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
    const res = await authService.requestPatientOtp(email);
    setOtpEmail(email);
    setRetryAt(Date.now() + OTP_RESEND_DELAY_MS);
    if (res?.debugOtp) {
      setSuccessMessage(`Mã xác thực đã tạo. (Demo OTP: ${res.debugOtp})`);
    }
  };

  const submitLogin = async (values: { email: string; password?: string; remember?: boolean }) => {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const email = values.email.trim().toLowerCase();
      if (!values.password) {
        throw new Error("Vui lòng nhập mật khẩu.");
      }
      const rememberMe = values.remember === true;
      await authService.login({ email, password: values.password, rememberMe });
      await authService.getCurrentUser();
      router.replace(ROUTES.DASHBOARD);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const submitRegister = async (values: {
    name?: string;
    phone?: string;
    email: string;
    password?: string;
    confirmPassword?: string;
  }) => {
    if (submitting.current) return;
    if (!values.name?.trim()) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }
    if (!values.phone?.trim()) {
      setError("Vui lòng nhập số điện thoại.");
      return;
    }
    if (!values.password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }
    if (values.confirmPassword && values.password !== values.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    submitting.current = true;
    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const email = values.email.trim().toLowerCase();
      const payload = {
        name: values.name.trim(),
        phone: values.phone.trim(),
        email,
        password: values.password,
      };
      pendingRegisterData.current = payload;
      const res = await authService.registerPatient(payload);
      setOtpEmail(email);
      setRetryAt(Date.now() + OTP_RESEND_DELAY_MS);
      setView("verify-otp");
      setSuccessMessage(
        res?.debugOtp
          ? `Mã xác thực đã tạo. (Demo OTP: ${res.debugOtp})`
          : "Mã xác thực 6 số đã được gửi tới email của bạn."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const submitVerifyRegister = async (values: { otpCode?: string; remember?: boolean }) => {
    if (submitting.current) return;
    if (!values.otpCode?.trim()) {
      setError("Vui lòng nhập mã OTP.");
      return;
    }
    submitting.current = true;
    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const rememberMe = values.remember === true;
      await authService.verifyPatientRegistration({
        email: otpEmail,
        otpCode: values.otpCode.trim(),
        rememberMe,
      });
      await authService.getCurrentUser();
      router.replace(ROUTES.DASHBOARD);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xác thực OTP thất bại.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const submit = async (values: LoginFormValues) => {
    if (view === "register") {
      await submitRegister(values);
      return;
    }
    if (view === "verify-otp") {
      await submitVerifyRegister(values);
      return;
    }
    if (otpEmail && values.otpCode) {
      if (submitting.current) return;
      submitting.current = true;
      setLoading(true);
      setError("");
      try {
        const rememberMe = values.remember === true;
        if (pendingRegisterData.current) {
          await authService.verifyPatientRegistration({
            email: otpEmail,
            otpCode: values.otpCode,
            rememberMe,
          });
        } else {
          await authService.verifyPatientOtp({
            email: otpEmail,
            otpCode: values.otpCode,
            rememberMe,
          });
        }
        await authService.getCurrentUser();
        router.replace(ROUTES.DASHBOARD);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
      } finally {
        submitting.current = false;
        setLoading(false);
      }
      return;
    }
    if (!values.password && mode === "patient" && !otpEmail) {
      if (submitting.current) return;
      submitting.current = true;
      setLoading(true);
      setError("");
      try {
        await requestOtp(values.email.trim().toLowerCase());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể gửi mã OTP.");
      } finally {
        submitting.current = false;
        setLoading(false);
      }
      return;
    }
    await submitLogin(values);
  };

  const resendOtp = async (): Promise<boolean> => {
    if (submitting.current || secondsLeft > 0) return false;
    submitting.current = true;
    setLoading(true);
    setError("");
    try {
      let res: { debugOtp?: string } | undefined;
      if (pendingRegisterData.current) {
        res = await authService.registerPatient(pendingRegisterData.current);
      } else {
        res = await authService.requestPatientOtp(otpEmail);
      }
      setRetryAt(Date.now() + OTP_RESEND_DELAY_MS);
      setSuccessMessage(
        res?.debugOtp
          ? `Mã xác thực mới đã tạo. (Demo OTP: ${res.debugOtp})`
          : "Mã xác thực mới đã được gửi tới email của bạn."
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi lại mã.");
      return false;
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const resetOtp = () => {
    setOtpEmail("");
    setError("");
    setSuccessMessage("");
    setView("login");
  };

  const changeMode = (nextMode: "patient" | "staff") => {
    setMode(nextMode);
    resetOtp();
  };

  const goToRegister = () => {
    setError("");
    setSuccessMessage("");
    setView("register");
  };

  const goToLogin = () => {
    setError("");
    setSuccessMessage("");
    setView("login");
  };

  return {
    loading,
    view,
    setView,
    mode,
    otpEmail,
    error,
    successMessage,
    secondsLeft,
    submit,
    submitLogin,
    submitRegister,
    submitVerifyRegister,
    resendOtp,
    resetOtp,
    changeMode,
    goToRegister,
    goToLogin,
  };
}
