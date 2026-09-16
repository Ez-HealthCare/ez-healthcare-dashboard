"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/lib/auth";
import { clearAuth, getStoredAuth, saveAuth } from "@/lib/auth";

interface VisitDepartment {
  id: string;
  code: string;
  name: string;
  floor: number;
}

interface VisitPatient {
  id: string;
  name: string;
  phone: string;
}

interface VisitRecord {
  id: string;
  ticketNumber: string;
  status: "WAITING" | "IN_SERVICE" | "COMPLETED" | "CANCELLED";
  chiefComplaint: string;
  createdAt: string;
  patient: VisitPatient;
  initialDepartment: VisitDepartment;
}

const AVAILABLE_DEPARTMENTS = [
  { code: "P.102", name: "Phòng khám Nội tổng quát (Tầng 1)", floor: 1 },
  { code: "P.105", name: "Phòng khám Tim mạch & Điện tim (Tầng 1)", floor: 1 },
  { code: "P.108", name: "Phòng Nội soi Tiêu hóa (Tầng 1)", floor: 1 },
  { code: "P.104", name: "Phòng Siêu âm Tổng quát (Tầng 1)", floor: 1 },
  { code: "P.201", name: "Phòng Xét nghiệm Huyết học (Tầng 2)", floor: 2 },
  { code: "P.302", name: "Phòng Chụp X-Quang KTS (Tầng 3)", floor: 3 },
];

export default function NurseReceptionPage() {
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

  // Intake form state
  const [patientName, setPatientName] = useState("Nguyễn Văn An");
  const [patientPhone, setPatientPhone] = useState("0912345678");
  const [departmentCode, setDepartmentCode] = useState("P.102");
  const [chiefComplaint, setChiefComplaint] = useState(
    "Đau âm ỉ thượng vị 3 ngày kèm ợ chua sau khi ăn"
  );
  const [gender, setGender] = useState("MALE");
  const [dateOfBirth, setDateOfBirth] = useState("1985-06-15");
  const [allergiesInput, setAllergiesInput] = useState("Aspirin");

  // UI State
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdVisit, setCreatedVisit] = useState<VisitRecord | null>(null);

  // Today's visits list state
  const [todayVisits, setTodayVisits] = useState<VisitRecord[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  // Auto-login helper for quick nurse testing
  const handleQuickNurseLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "nurse@hospital.vn",
          password: "Password123!",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Đăng nhập thất bại");
      saveAuth(data);
      setCurrentUser(data.user);
      setAuthToken(data.accessToken);
      setFormError(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Không thể đăng nhập điều dưỡng");
    }
  };

  // Fetch today's visits list on manual trigger
  const fetchTodayVisits = useCallback(async () => {
    if (!authToken) return;
    setLoadingVisits(true);
    try {
      const res = await fetch(`${API_URL}/visits/today`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setTodayVisits(data);
      }
    } catch {
      // Ignore background refresh errors
    } finally {
      setLoadingVisits(false);
    }
  }, [authToken, API_URL]);

  // Initial load on mount or authToken change
  useEffect(() => {
    let isMounted = true;
    if (!authToken) return;

    fetch(`${API_URL}/visits/today`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setTodayVisits(data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [authToken, API_URL]);

  // Intake submission
  const handleSubmitIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      setFormError("Bạn chưa đăng nhập với quyền Điều dưỡng. Hãy bấm Đăng nhập nhanh bên dưới.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const allergies = allergiesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`${API_URL}/visits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          patientName: patientName.trim(),
          patientPhone: patientPhone.trim(),
          departmentCode,
          chiefComplaint: chiefComplaint.trim(),
          gender,
          dateOfBirth,
          allergies: allergies.length > 0 ? allergies : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg =
          data.message ||
          (Array.isArray(data.message) ? data.message.join(", ") : null) ||
          "Không thể tạo lượt khám";
        throw new Error(errorMsg);
      }

      setCreatedVisit(data);
      fetchTodayVisits();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tạo lượt khám");
    } finally {
      setSubmitting(false);
    }
  };

  const fillTemplate = (
    name: string,
    phone: string,
    dept: string,
    complaint: string,
    gen: string,
    allergies: string
  ) => {
    setPatientName(name);
    setPatientPhone(phone);
    setDepartmentCode(dept);
    setChiefComplaint(complaint);
    setGender(gen);
    setAllergiesInput(allergies);
    setFormError(null);
  };

  const filteredVisits = todayVisits.filter((v) => {
    const matchSearch =
      v.ticketNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
      v.patient?.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      v.patient?.phone?.includes(searchFilter);

    if (statusFilter === "ALL") return matchSearch;
    return matchSearch && v.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Station title */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold hover:bg-emerald-600/20 transition-colors"
              title="Quay lại Cổng Đăng nhập"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 leading-none">
                  Tiếp Nhận &amp; Phân Luồng Sảnh (Screen S0)
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  NURSE RECEPTION
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Bàn Điều dưỡng tiếp đón • Cấp phát số thứ tự khám (#A-xxx)
              </p>
            </div>
          </div>

          {/* User info & Navigation */}
          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <div className="flex items-center gap-2 text-xs bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-700">
                  {currentUser.name || currentUser.email}
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                  {currentUser.role}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleQuickNurseLogin}
                className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                ⚡ 1-Click Đăng nhập Điều dưỡng
              </button>
            )}

            <Link
              href="/doctor"
              className="text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              Sang Bàn Bác Sĩ (S5) &rarr;
            </Link>

            <button
              type="button"
              onClick={() => {
                clearAuth();
                setCurrentUser(null);
                setAuthToken(null);
                router.push("/");
              }}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
              title="Đăng xuất"
            >
              Thoát
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Intake Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-none">
                    Phiếu Tiếp Nhận Bệnh Nhân
                  </h2>
                  <span className="text-[11px] text-slate-400">Khởi tạo lượt khám mới</span>
                </div>
              </div>

              <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                STAGE 0 / S0
              </span>
            </div>

            {/* Quick Demo Templates */}
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Điền nhanh kịch bản kiểm thử:
              </span>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    fillTemplate(
                      "Nguyễn Văn An",
                      "0912345678",
                      "P.102",
                      "Đau âm ỉ thượng vị 3 ngày, ợ chua sau ăn, tiền sử viêm loét",
                      "MALE",
                      "Aspirin"
                    )
                  }
                  className="w-full text-left px-2.5 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs text-slate-800 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="font-semibold">
                    ⭐ Kịch bản 1: BN Nguyễn Văn An &rarr; P.102
                  </span>
                  <span className="text-[10px] text-emerald-700 font-mono">Đau dạ dày</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    fillTemplate(
                      "Trần Thị Bích",
                      "0987654321",
                      "P.105",
                      "Cảm giác đau thắt ngực trái lan lên vai, khó thở khi gắng sức",
                      "FEMALE",
                      "Penicillin"
                    )
                  }
                  className="w-full text-left px-2.5 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-xl text-xs text-slate-800 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="font-semibold">
                    🚨 Kịch bản 2: BN Trần Thị Bích &rarr; P.105
                  </span>
                  <span className="text-[10px] text-rose-700 font-mono">Tim mạch</span>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitIntake} className="space-y-3.5">
              {/* Patient Name */}
              <div className="space-y-1">
                <label
                  htmlFor="patientNameInput"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Họ và tên bệnh nhân <span className="text-rose-500">*</span>
                </label>
                <input
                  id="patientNameInput"
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              {/* Patient Phone & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="patientPhoneInput"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="patientPhoneInput"
                    type="tel"
                    required
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium font-mono focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="genderSelect"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Giới tính
                  </label>
                  <select
                    id="genderSelect"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value="MALE">Nam (Male)</option>
                    <option value="FEMALE">Nữ (Female)</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>

              {/* Initial Department Select */}
              <div className="space-y-1">
                <label
                  htmlFor="departmentSelect"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Phòng khám lâm sàng chỉ định ban đầu <span className="text-rose-500">*</span>
                </label>
                <select
                  id="departmentSelect"
                  value={departmentCode}
                  onChange={(e) => setDepartmentCode(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-emerald-800 bg-emerald-50/40 focus:outline-none focus:border-emerald-500"
                >
                  {AVAILABLE_DEPARTMENTS.map((dept) => (
                    <option key={dept.code} value={dept.code}>
                      [{dept.code}] {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chief Complaint */}
              <div className="space-y-1">
                <label
                  htmlFor="complaintTextarea"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Lý do khám / Triệu chứng lâm sàng sơ bộ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="complaintTextarea"
                  required
                  rows={2}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="Mô tả triệu chứng chính của người bệnh..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              {/* Date of birth & Allergies */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="dobInput" className="block text-xs font-semibold text-slate-700">
                    Ngày sinh
                  </label>
                  <input
                    id="dobInput"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full h-10 px-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="allergiesInput"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Tiền sử dị ứng
                  </label>
                  <input
                    id="allergiesInput"
                    type="text"
                    value={allergiesInput}
                    onChange={(e) => setAllergiesInput(e.target.value)}
                    placeholder="Aspirin, Paracetamol..."
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Error message */}
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <span>Đang cấp số thứ tự...</span>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                    <span>Tiếp Nhận &amp; Cấp Số Thứ Tự (#A-xxx)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column (7 Cols): Today's Visits Table & Queue Monitor */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col h-full min-h-[550px]">
            {/* Table Header & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-none">
                  Danh Sách Tiếp Nhận Hôm Nay
                </h2>
                <span className="text-[11px] text-slate-400">
                  {todayVisits.length} lượt khám đã đăng ký trong ngày
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchTodayVisits}
                  disabled={loadingVisits}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  title="Làm mới danh sách"
                >
                  <svg
                    className={`w-3.5 h-3.5 ${loadingVisits ? "animate-spin" : ""}`}
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
                  Làm mới
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="py-3 flex flex-wrap gap-2 items-center justify-between">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Tìm theo số vé (#A-xxx), tên BN, SĐT..."
                  className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                />
                <svg
                  className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === "ALL" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("WAITING")}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === "WAITING"
                      ? "bg-white text-amber-800 shadow-2xs"
                      : "text-slate-600"
                  }`}
                >
                  Đang chờ
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("IN_SERVICE")}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    statusFilter === "IN_SERVICE"
                      ? "bg-white text-sky-800 shadow-2xs"
                      : "text-slate-600"
                  }`}
                >
                  Đang khám
                </button>
              </div>
            </div>

            {/* Visits List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredVisits.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
                    <svg
                      className="w-6 h-6 text-slate-400"
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
                  </div>
                  <p className="text-xs font-semibold">Chưa có lượt tiếp nhận nào phù hợp</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Hãy điền form bên trái để cấp số thứ tự mới
                  </p>
                </div>
              ) : (
                filteredVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className="p-3.5 rounded-2xl border border-slate-200/90 hover:border-emerald-300 bg-white hover:bg-emerald-50/20 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      {/* Ticket Number Badge */}
                      <div className="w-14 h-12 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0 shadow-inner">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono">
                          TICKET
                        </span>
                        <span className="text-sm font-black font-mono tracking-tight text-emerald-400 leading-none">
                          {visit.ticketNumber}
                        </span>
                      </div>

                      {/* Patient & Complaint Details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {visit.patient?.name || "Bệnh nhân"}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            {visit.patient?.phone}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                          {visit.chiefComplaint}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Phòng: {visit.initialDepartment?.code} - {visit.initialDepartment?.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(visit.createdAt).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Quick Action */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {visit.status === "WAITING" && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          Chờ khám
                        </span>
                      )}
                      {visit.status === "IN_SERVICE" && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                          Đang khám
                        </span>
                      )}
                      {visit.status === "COMPLETED" && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Đã xong
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setCreatedVisit(visit)}
                        className="text-xs text-slate-500 hover:text-emerald-700 underline font-medium cursor-pointer"
                      >
                        Xem phiếu in
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* TICKET CONFIRMATION MODAL (In phiếu khám bệnh) */}
      {createdVisit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Ticket Header */}
            <div className="bg-emerald-600 text-white p-5 text-center relative">
              <button
                type="button"
                onClick={() => setCreatedVisit(null)}
                className="absolute right-4 top-4 text-white/80 hover:text-white cursor-pointer"
                title="Đóng phiếu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <div className="w-10 h-10 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-1.5">
                <svg
                  className="w-5 h-5 text-white"
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
              </div>

              <span className="text-[11px] font-bold tracking-widest uppercase opacity-90">
                PHIẾU KHÁM BỆNH ĐIỆN TỬ
              </span>
              <h3 className="text-xl font-black mt-0.5">Tiếp Nhận Thành Công!</h3>
            </div>

            {/* Ticket Body / Printable Cutout */}
            <div className="p-6 space-y-4">
              {/* Big Ticket Display */}
              <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  SỐ THỨ TỰ CỦA BỆNH NHÂN
                </span>
                <span className="text-4xl font-black font-mono text-emerald-700 tracking-tight block my-1">
                  {createdVisit.ticketNumber}
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  Ước tính thời gian chờ: <strong className="text-slate-900">5 - 10 phút</strong>
                </span>
              </div>

              {/* Patient and Room details */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Bệnh nhân:</span>
                  <span className="font-bold text-slate-900">
                    {createdVisit.patient?.name} ({createdVisit.patient?.phone})
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Phòng khám chỉ định:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    [{createdVisit.initialDepartment?.code}] {createdVisit.initialDepartment?.name}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Lý do khám:</span>
                  <span className="font-medium text-slate-800 text-right max-w-[240px] truncate">
                    {createdVisit.chiefComplaint}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Thời gian cấp:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(createdVisit.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => router.push("/doctor")}
                  className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                  <span>Chuyển Sang Bàn Khám Bác Sĩ (Screen S5)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/patient")}
                    className="h-10 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Lộ trình BN (Screen S3)
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreatedVisit(null)}
                    className="h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Tiếp nhận BN tiếp theo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
