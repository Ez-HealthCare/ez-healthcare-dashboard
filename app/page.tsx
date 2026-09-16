"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AuthResponse, Role, UserProfile } from "@/lib/auth";
import { clearAuth, getStoredAuth, saveAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  // Form state
  const [selectedRole, setSelectedRole] = useState<Role>("PHYSICIAN");
  const [identifier, setIdentifier] = useState("doctor@hospital.vn");
  const [password, setPassword] = useState("Password123!");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showSecurityTools, setShowSecurityTools] = useState(false);

  // Auth session state initialized from localStorage
  const [authData, setAuthData] = useState<AuthResponse | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = getStoredAuth();
    if (stored.token && stored.user) {
      return {
        accessToken: stored.token,
        refreshToken: localStorage.getItem("ez_refresh_token") || "",
        user: stored.user,
      };
    }
    return null;
  });
  const [oldRefreshToken, setOldRefreshToken] = useState<string | null>(null);
  const [profileResult, setProfileResult] = useState<UserProfile | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  const redirectToRoleScreen = useCallback(
    (role: Role) => {
      switch (role) {
        case "PHYSICIAN":
          router.push("/doctor");
          break;
        case "NURSE":
          router.push("/nurse");
          break;
        case "PATIENT":
          router.push("/patient");
          break;
        case "ADMIN":
          router.push("/doctor");
          break;
        default:
          break;
      }
    },
    [router]
  );

  // Countdown timer for automatic redirect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      if (authData?.user) {
        redirectToRoleScreen(authData.user.role);
      }
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, authData, redirectToRoleScreen]);

  const applyDemoUser = (role: Role, idVal: string, passVal: string) => {
    setSelectedRole(role);
    setIdentifier(idVal);
    setPassword(passVal);
    setError(null);
  };

  const handleRoleTabChange = (role: Role) => {
    setSelectedRole(role);
    setError(null);
    switch (role) {
      case "PATIENT":
        setIdentifier("0912345678");
        setPassword("Password123!");
        break;
      case "PHYSICIAN":
        setIdentifier("doctor@hospital.vn");
        setPassword("Password123!");
        break;
      case "NURSE":
        setIdentifier("nurse@hospital.vn");
        setPassword("Password123!");
        break;
      case "ADMIN":
        setIdentifier("admin@ezhealthcare.com");
        setPassword("Admin@123456");
        break;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg =
          data.message ||
          (Array.isArray(data.message) ? data.message.join(", ") : null) ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.";
        throw new Error(errorMsg);
      }

      saveAuth(data);
      setAuthData(data);
      setSuccessMessage(`Đăng nhập thành công! Chào mừng ${data.user.name || data.user.email}.`);
      setCountdown(3);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể kết nối đến máy chủ API";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    setAuthData(null);
    setCountdown(null);
    setProfileResult(null);
    setSuccessMessage("Đã đăng xuất phiên làm việc.");
    setError(null);
  };

  const handleRefreshToken = async () => {
    if (!authData?.refreshToken) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      setOldRefreshToken(authData.refreshToken);

      const response = await fetch(`${API_URL}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: authData.refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Làm mới token thất bại");
      }

      saveAuth(data);
      setAuthData(data);
      setSuccessMessage("Làm mới token thành công (Rotation cấp token mới)!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi làm mới token";
      setError(message);
      if (message.includes("thu hồi") || message.includes("hết hạn")) {
        clearAuth();
        setAuthData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestReplayAttack = async () => {
    if (!oldRefreshToken) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_URL}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: oldRefreshToken }),
      });

      const data = await response.json();

      if (response.ok) {
        throw new Error("Lỗi: Token cũ không nên được chấp nhận!");
      }

      throw new Error(data.message || "Server đã phát hiện hành vi tái sử dụng token cũ!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi kiểm tra Replay Attack";
      setError(
        `[Mô phỏng Replay Attack]: Server đã thu hồi toàn bộ token gia đình! Chi tiết: "${message}"`
      );
      clearAuth();
      setAuthData(null);
      setOldRefreshToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGetProfile = async () => {
    if (!authData?.accessToken) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_URL}/users/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authData.accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể lấy thông tin người dùng");
      }

      setProfileResult(data);
      setSuccessMessage("Đã truy xuất thông tin từ Protected API thành công!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi truy cập Protected API";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case "PHYSICIAN":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-300">
            Bác sĩ Khám
          </span>
        );
      case "NURSE":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Điều dưỡng Sảnh
          </span>
        );
      case "PATIENT":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
            Bệnh nhân
          </span>
        );
      case "ADMIN":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
            Quản trị viên
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-4 sm:p-6 selection:bg-teal-500 selection:text-white">
      {/* Minimal Top Header */}
      <header className="w-full max-w-5xl mx-auto flex justify-between items-center py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-600/10 text-teal-600 flex items-center justify-center font-bold shadow-xs">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">
              EZHealth EMR
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Sprint 1 • Triage &amp; Điều phối DAG
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/mock"
            className="text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
            Mockup Gallery (8 Màn)
          </Link>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>NestJS API :3000</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Section */}
      <main className="w-full max-w-[480px] mx-auto my-auto py-6">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-7 sm:p-9">
          {/* Card Header Branding */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-teal-600/10 text-teal-600 mx-auto flex items-center justify-center mb-3 shadow-inner">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-teal-600">
              CỔNG ĐĂNG NHẬP THÔNG MINH
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Đăng nhập hệ thống
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Hệ thống Tiếp nhận, Khám lâm sàng &amp; Điều phối Lộ trình Khám
            </p>
          </div>

          {/* If already authenticated, show Welcome & Route Selector */}
          {authData ? (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                      Đã xác thực thành công
                    </span>
                  </div>
                  {getRoleBadge(authData.user.role)}
                </div>

                <p className="text-base font-bold text-slate-900">
                  {authData.user.name || "Người dùng"}
                </p>
                <p className="text-xs text-slate-600 font-mono mt-0.5">
                  {authData.user.email}
                  {authData.user.phone ? ` • ${authData.user.phone}` : ""}
                </p>
              </div>

              {/* Countdown banner */}
              {countdown !== null && (
                <div className="flex items-center justify-between bg-sky-50 border border-sky-200 px-3.5 py-2.5 rounded-xl text-xs text-sky-800">
                  <span>
                    Tự động chuyển tới màn hình làm việc sau: <strong>{countdown}s</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCountdown(null)}
                    className="underline text-sky-700 hover:text-sky-900 font-semibold cursor-pointer"
                  >
                    Hủy tự động
                  </button>
                </div>
              )}

              {/* Action Buttons Based on Role */}
              <div className="space-y-2.5 pt-1">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Chọn không gian làm việc của bạn:
                </p>

                {authData.user.role === "PHYSICIAN" && (
                  <button
                    type="button"
                    onClick={() => router.push("/doctor")}
                    className="w-full h-11 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-sm flex items-center justify-between shadow-md shadow-sky-600/20 transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Vào Bàn Khám Bác Sĩ (Screen S5 • P.102)
                    </span>
                    <span className="text-xs bg-sky-500/50 px-2 py-0.5 rounded">Chính thức</span>
                  </button>
                )}

                {authData.user.role === "NURSE" && (
                  <button
                    type="button"
                    onClick={() => router.push("/nurse")}
                    className="w-full h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm flex items-center justify-between shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      Vào Tiếp Nhận Điều Dưỡng Sảnh (Screen S0)
                    </span>
                    <span className="text-xs bg-emerald-500/50 px-2 py-0.5 rounded">
                      Chính thức
                    </span>
                  </button>
                )}

                {authData.user.role === "PATIENT" && (
                  <button
                    type="button"
                    onClick={() => router.push("/patient")}
                    className="w-full h-11 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm flex items-center justify-between shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                      Xem Lộ Trình Khám Bệnh Nhân (Screen S3)
                    </span>
                    <span className="text-xs bg-indigo-500/50 px-2 py-0.5 rounded">Chính thức</span>
                  </button>
                )}

                {authData.user.role === "ADMIN" && (
                  <button
                    type="button"
                    onClick={() => router.push("/doctor")}
                    className="w-full h-11 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm flex items-center justify-between shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                  >
                    <span>Truy cập Console Quản trị (Admin)</span>
                    <span className="text-xs bg-purple-500/50 px-2 py-0.5 rounded">Toàn quyền</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => router.push("/nurse")}
                    className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 text-left transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>P. Tiếp nhận (S0)</span>
                    <span className="text-[10px] text-slate-400">Nurse</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/doctor")}
                    className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 text-left transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>P. Bác sĩ (S5)</span>
                    <span className="text-[10px] text-slate-400">Doctor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/patient")}
                    className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 text-left transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>Lộ trình BN (S3)</span>
                    <span className="text-[10px] text-slate-400">Patient</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/mock")}
                    className="h-9 px-3 rounded-lg border border-teal-200 bg-teal-50/70 hover:bg-teal-100 text-xs font-semibold text-teal-800 text-left transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>Mock Gallery</span>
                    <span className="text-[10px] text-teal-600">8 Screens</span>
                  </button>
                </div>
              </div>

              {/* Logout button */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowSecurityTools((prev) => !prev)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  {showSecurityTools ? "Ẩn công cụ bảo mật" : "Công cụ JWT & Token"}
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                >
                  Đăng xuất
                </button>
              </div>

              {/* Security & Token Inspector Tools */}
              {showSecurityTools && (
                <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs space-y-3 font-mono">
                  <div className="flex justify-between items-center text-slate-400 border-b border-slate-700 pb-2">
                    <span className="font-bold text-teal-400">TOKEN INSPECTOR (SPRINT 1)</span>
                    <span>Role: {authData.user.role}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Access Token:</span>
                    <div className="p-2 bg-slate-950 rounded break-all text-[11px] text-slate-300 max-h-16 overflow-y-auto">
                      {authData.accessToken}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleRefreshToken}
                      disabled={loading}
                      className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-[11px] font-sans font-semibold cursor-pointer"
                    >
                      Làm mới Token
                    </button>
                    <button
                      type="button"
                      onClick={handleTestReplayAttack}
                      disabled={loading || !oldRefreshToken}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-sans font-semibold cursor-pointer disabled:opacity-50"
                    >
                      Test Replay Attack
                    </button>
                    <button
                      type="button"
                      onClick={handleGetProfile}
                      disabled={loading}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-sans font-semibold cursor-pointer"
                    >
                      Gọi Protected API
                    </button>
                  </div>

                  {profileResult && (
                    <div className="p-2 bg-slate-950 rounded text-[11px] text-emerald-400">
                      User Profile: {JSON.stringify(profileResult, null, 2)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Role Switcher Tabs */}
              <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => handleRoleTabChange("PHYSICIAN")}
                  className={`flex-1 py-2 rounded-xl font-semibold transition-all text-center cursor-pointer ${
                    selectedRole === "PHYSICIAN"
                      ? "bg-white text-teal-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Bác sĩ
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleTabChange("NURSE")}
                  className={`flex-1 py-2 rounded-xl font-semibold transition-all text-center cursor-pointer ${
                    selectedRole === "NURSE"
                      ? "bg-white text-teal-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Điều dưỡng
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleTabChange("PATIENT")}
                  className={`flex-1 py-2 rounded-xl font-semibold transition-all text-center cursor-pointer ${
                    selectedRole === "PATIENT"
                      ? "bg-white text-teal-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Bệnh nhân
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleTabChange("ADMIN")}
                  className={`flex-1 py-2 rounded-xl font-semibold transition-all text-center cursor-pointer ${
                    selectedRole === "ADMIN"
                      ? "bg-white text-teal-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Quản trị
                </button>
              </div>

              {/* Demo Account Quick Chips */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Tài khoản Demo (Sprint 1 Seeded):
                  </span>
                  <span className="text-[10px] text-teal-600 font-medium">1-Click điền</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyDemoUser("PHYSICIAN", "doctor@hospital.vn", "Password123!")}
                    className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-800 border border-sky-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    👨‍⚕️ BS. Trần Lâm (P.102)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDemoUser("NURSE", "nurse@hospital.vn", "Password123!")}
                    className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    👩‍⚕️ ĐD. Lê Mai (Sảnh)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDemoUser("PATIENT", "0912345678", "Password123!")}
                    className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    🧑 BN. Nguyễn Văn A
                  </button>
                </div>
              </div>

              {/* Input: Identifier */}
              <div className="space-y-1.5">
                <label
                  htmlFor="identifierInput"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {selectedRole === "PATIENT"
                    ? "Số điện thoại / Mã định danh bệnh nhân"
                    : "Email / Tên đăng nhập cán bộ"}
                </label>
                <div className="relative">
                  <input
                    id="identifierInput"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={selectedRole === "PATIENT" ? "0912345678" : "doctor@hospital.vn"}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Input: Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="passwordInput"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Mật khẩu
                  </label>
                  <span className="text-[11px] text-slate-400">Mặc định: Password123!</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    id="passwordInput"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-11 pl-3.5 pr-11 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500/20"
                  />
                  <span>Ghi nhớ phiên đăng nhập</span>
                </label>
                <span className="text-teal-600 font-medium hover:underline cursor-pointer">
                  Quên mật khẩu?
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng nhập vào hệ thống</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Feedback messages */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
              <svg
                className="w-4 h-4 text-rose-600 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {successMessage && !authData && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto py-3 text-center text-xs text-slate-400">
        <p>
          EZHealth Clinical EMR &bull; Khóa luận tốt nghiệp &bull; Sprint 1: Directed Acyclic Graph
          Triage Engine
        </p>
      </footer>
    </div>
  );
}
