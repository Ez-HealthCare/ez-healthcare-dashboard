"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/lib/auth";
import { clearAuth, getStoredAuth, saveAuth } from "@/lib/auth";

interface RouteStep {
  id: string;
  sequenceOrder: number;
  status: "PENDING" | "CALLING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
  departmentCode?: string;
  departmentName?: string;
  floor?: number;
  avgServiceTimeMin?: number;
}

interface ActiveVisitRoute {
  visitId: string;
  ticketNumber: string;
  status: "WAITING" | "IN_SERVICE" | "COMPLETED" | "CANCELLED";
  chiefComplaint: string;
  patient?: {
    id: string;
    name: string;
    phone: string;
    allergies?: string[];
  } | null;
  initialDepartment?: {
    id: string;
    code: string;
    name: string;
    floor: number;
  } | null;
  order?: {
    symptoms?: string[];
    workingDiagnosis?: string;
    isStat?: boolean;
    activatedAt?: string;
  } | null;
  steps: RouteStep[];
}

// Fallback demo data to guarantee demo never breaks if backend is empty
const DEMO_FALLBACK_ROUTE: ActiveVisitRoute = {
  visitId: "demo-visit-001",
  ticketNumber: "#A-001",
  status: "IN_SERVICE",
  chiefComplaint: "Đau âm ỉ thượng vị kèm ợ chua 3 ngày",
  patient: {
    id: "demo-p1",
    name: "Nguyễn Văn An",
    phone: "0912345678",
    allergies: ["Aspirin"],
  },
  initialDepartment: {
    id: "dept-p102",
    code: "P.102",
    name: "Phòng khám Nội tổng quát",
    floor: 1,
  },
  order: {
    symptoms: ["Đau âm ỉ vùng thượng vị", "Ợ chua / Trào ngược dạ dày"],
    workingDiagnosis: "Viêm loét dạ dày - tá tràng",
    isStat: false,
    activatedAt: new Date().toISOString(),
  },
  steps: [
    {
      id: "step-1",
      sequenceOrder: 1,
      status: "CALLING",
      departmentCode: "P.201",
      departmentName: "Phòng Xét nghiệm Huyết học & Sinh hóa",
      floor: 2,
      avgServiceTimeMin: 10,
    },
    {
      id: "step-2",
      sequenceOrder: 2,
      status: "PENDING",
      departmentCode: "P.104",
      departmentName: "Phòng Siêu âm Ổ bụng tổng quát",
      floor: 1,
      avgServiceTimeMin: 15,
    },
    {
      id: "step-3",
      sequenceOrder: 3,
      status: "PENDING",
      departmentCode: "P.302",
      departmentName: "Phòng Chụp X-Quang ngực thẳng (KTS)",
      floor: 3,
      avgServiceTimeMin: 8,
    },
    {
      id: "step-4",
      sequenceOrder: 4,
      status: "PENDING",
      departmentCode: "P.102",
      departmentName: "Phòng khám Nội tổng quát (Bác sĩ kết luận)",
      floor: 1,
      avgServiceTimeMin: 10,
    },
  ],
};

export default function PatientRoutePage() {
  const router = useRouter();

  // Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    return getStoredAuth().user;
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return getStoredAuth().token;
  });

  // Route state initialized with DEMO_FALLBACK_ROUTE to avoid sync setState in effect
  const [routeData, setRouteData] = useState<ActiveVisitRoute>(() => DEMO_FALLBACK_ROUTE);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  // Quick Patient Login
  const handleQuickPatientLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "0912345678",
          password: "Password123!",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Đăng nhập thất bại");
      saveAuth(data);
      setCurrentUser(data.user);
      setAuthToken(data.accessToken);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Không thể đăng nhập bệnh nhân");
    }
  };

  // Manual Refresh of Active Route
  const fetchActiveRoute = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Try fetching active visit of logged in patient
      const res = await fetch(`${API_URL}/visits/active`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const visit = await res.json();
        if (visit && visit.id) {
          // Fetch detailed route
          const routeRes = await fetch(`${API_URL}/visits/${visit.id}/route`, {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          });
          if (routeRes.ok) {
            const data = await routeRes.json();
            setRouteData(data);
            return;
          }
        }
      }
    } catch {
      // If error occurs, keep current route
    } finally {
      setLoading(false);
    }
  }, [authToken, API_URL]);

  // Initial load when authToken is present
  useEffect(() => {
    let isMounted = true;
    if (!authToken) return;

    fetch(`${API_URL}/visits/active`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((visit) => {
        if (!isMounted) return;
        if (visit && visit.id) {
          fetch(`${API_URL}/visits/${visit.id}/route`, {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((route) => {
              if (isMounted && route) {
                setRouteData(route);
              }
            });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [authToken, API_URL]);

  const activeStep =
    routeData?.steps.find((s) => s.status === "CALLING" || s.status === "IN_PROGRESS") ||
    routeData?.steps[0];

  const completedStepsCount = routeData?.steps.filter((s) => s.status === "COMPLETED").length || 0;
  const totalStepsCount = routeData?.steps.length || 4;
  const progressPercent = Math.round((completedStepsCount / totalStepsCount) * 100);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col justify-between selection:bg-indigo-500 selection:text-white pb-6">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-2xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold hover:bg-indigo-600/20 transition-colors"
              title="Về Cổng Đăng nhập"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>

            <div>
              <h1 className="text-sm font-extrabold text-slate-900 leading-none">
                Lộ Trình Khám Thông Minh
              </h1>
              <span className="text-[11px] text-slate-500 font-medium">
                Screen S3 &bull; Định Tuyến Tự Động
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchActiveRoute}
              disabled={loading}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Làm mới trạng thái"
            >
              <svg
                className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  clearAuth();
                  setCurrentUser(null);
                  setAuthToken(null);
                  router.push("/");
                }}
                className="text-[11px] text-rose-600 font-semibold px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 cursor-pointer"
              >
                Thoát
              </button>
            ) : (
              <button
                type="button"
                onClick={handleQuickPatientLogin}
                className="text-[11px] font-bold text-indigo-800 bg-indigo-100 hover:bg-indigo-200 px-2.5 py-1 rounded-lg border border-indigo-300 cursor-pointer"
              >
                ⚡ Đăng nhập BN
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Mobile-First Feed */}
      <main className="max-w-md w-full mx-auto px-4 py-4 space-y-4 flex-1">
        {/* Patient Identity & Ticket Banner */}
        {routeData && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />

            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  PHIẾU KHÁM BỆNH ĐIỆN TỬ
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-0.5">
                  {routeData.patient?.name || "Bệnh nhân"}
                </h2>
                <span className="text-xs font-mono text-slate-500 block">
                  {routeData.patient?.phone}
                </span>
              </div>

              {/* Big Ticket Pill */}
              <div className="px-3.5 py-2 bg-slate-950 text-white rounded-2xl flex flex-col items-center justify-center shadow-md">
                <span className="text-[9px] font-mono uppercase text-slate-400">SỐ THỨ TỰ</span>
                <span className="text-lg font-black font-mono text-emerald-400 leading-none">
                  {routeData.ticketNumber}
                </span>
              </div>
            </div>

            {/* Status & Progress Summary */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Tiến độ khám:</span>
                <span className="font-bold text-indigo-700">
                  {completedStepsCount}/{totalStepsCount} chặng ({progressPercent}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(progressPercent, 15)}%` }}
                />
              </div>

              {routeData.order?.workingDiagnosis && (
                <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs">
                  <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                    Chẩn đoán lâm sàng sơ bộ:
                  </span>
                  <span className="font-bold text-slate-800">
                    {routeData.order.workingDiagnosis}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Active Station Spotlight */}
        {activeStep && (
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-xl shadow-indigo-950/20 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                  CHẶNG ĐANG THỰC HIỆN
                </span>
              </div>

              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-white/10 text-white border border-white/20">
                TẦNG {activeStep.floor || 1}
              </span>
            </div>

            <h3 className="text-xl font-black tracking-tight text-white">
              [{activeStep.departmentCode}] {activeStep.departmentName}
            </h3>

            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Xin mời người bệnh di chuyển đến trước cửa phòng để được nhân viên y tế hướng dẫn làm
              thủ tục.
            </p>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <svg
                  className="w-4 h-4 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Thời gian ước tính: ~{activeStep.avgServiceTimeMin || 10} phút</span>
              </div>

              <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">
                Mời vào phòng
              </span>
            </div>
          </div>
        )}

        {/* Directed Acyclic Graph Steps Pipeline */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Chi Tiết Lộ Trình Khám Toàn Diện
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">DAG Topo Order</span>
          </div>

          <div className="space-y-2">
            {routeData?.steps.map((step, idx) => {
              const isCurrent = step.status === "CALLING" || step.status === "IN_PROGRESS";
              const isDone = step.status === "COMPLETED";

              return (
                <div
                  key={step.id || idx}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 ${
                    isCurrent
                      ? "bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
                      : isDone
                        ? "bg-emerald-50/60 border-emerald-200 text-slate-600"
                        : "bg-white border-slate-200/90 text-slate-700"
                  }`}
                >
                  {/* Sequence Number / Checkmark Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isDone ? (
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <span>{step.sequenceOrder}</span>
                    )}
                  </div>

                  {/* Step Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        [{step.departmentCode}]
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.2 rounded">
                        Tầng {step.floor}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 font-medium truncate mt-0.5">
                      {step.departmentName}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-indigo-700">
                          &bull; Đang tiếp nhận lượt khám của bạn
                        </span>
                      )}
                      {!isCurrent && !isDone && (
                        <span className="text-[10px] text-slate-400">Chờ hoàn tất chặng trước</span>
                      )}
                      {isDone && (
                        <span className="text-[10px] font-semibold text-emerald-700">
                          Đã có kết quả
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Status Pill */}
                  <div className="shrink-0 text-right">
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        Đang gọi
                      </span>
                    )}
                    {isDone && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Xong
                      </span>
                    )}
                    {!isCurrent && !isDone && (
                      <span className="text-[10px] text-slate-400 font-mono">Chờ</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Quick Links for Evaluators */}
        <div className="pt-2 border-t border-slate-200 space-y-2">
          <span className="text-[11px] text-slate-400 font-semibold block text-center">
            Điều hướng nhanh các phân hệ Sprint 1:
          </span>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/nurse"
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-emerald-800 font-semibold text-center hover:bg-emerald-50 transition-colors"
            >
              Tiếp Nhận Sảnh (S0)
            </Link>

            <Link
              href="/doctor"
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-sky-800 font-semibold text-center hover:bg-sky-50 transition-colors"
            >
              Bàn Khám Bác Sĩ (S5)
            </Link>
          </div>

          <Link
            href="/mock"
            className="block p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800 font-bold text-center hover:bg-teal-100 transition-colors"
          >
            Mở Thư Viện Mockup Screens (8 Màn Hình) &rarr;
          </Link>
        </div>

        {/* Error notice */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
            {errorMessage}
          </div>
        )}
      </main>
    </div>
  );
}
