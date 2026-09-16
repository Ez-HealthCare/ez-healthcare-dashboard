"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/lib/auth";
import { clearAuth, getStoredAuth, saveAuth } from "@/lib/auth";

interface PatientInfo {
  id: string;
  name: string;
  phone: string;
  gender?: string;
  allergies?: string[];
  dateOfBirth?: string;
}

interface VisitQueueItem {
  id: string;
  ticketNumber: string;
  status: "WAITING" | "IN_SERVICE" | "COMPLETED";
  chiefComplaint: string;
  createdAt: string;
  patient: PatientInfo;
}

interface DagStep {
  id: string;
  departmentCode: string;
  departmentName: string;
  floor: number;
  sequenceOrder: number;
  status: string;
  prerequisiteCode?: string;
}

interface DagEdge {
  from: string;
  to: string;
  type: string;
  reason: string;
}

interface DagResponse {
  visitId: string;
  ticketNumber: string;
  isAcyclic: boolean;
  isStat: boolean;
  vertices: string[];
  edges: DagEdge[];
  sortedOrder: string[];
  safetyAlerts: string[];
  steps: DagStep[];
}

const AVAILABLE_ORDERS = [
  {
    code: "P.201",
    name: "Xét nghiệm Huyết học & Sinh hóa máu",
    floor: 2,
    badge: "Nhịn ăn",
    badgeColor: "amber",
  },
  {
    code: "P.104",
    name: "Siêu âm Ổ bụng tổng quát",
    floor: 1,
    badge: "Bàng quang căng",
    badgeColor: "sky",
  },
  {
    code: "P.302",
    name: "Chụp X-Quang ngực thẳng (KTS)",
    floor: 3,
    badge: "Bức xạ Tia X",
    badgeColor: "rose",
  },
  {
    code: "P.203",
    name: "Xét nghiệm Nước tiểu 10 thông số",
    floor: 2,
    badge: "Sau siêu âm",
    badgeColor: "indigo",
  },
];

const SYMPTOM_OPTIONS = [
  "Đau âm ỉ vùng thượng vị",
  "Ợ chua / Trào ngược dạ dày",
  "Đau thắt ngực trái cấp",
  "Khó thở khi gắng sức",
  "Sốt cao > 38.5°C",
  "Chướng bụng, khó tiêu",
];

export default function DoctorWorkspacePage() {
  const router = useRouter();

  // Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    return getStoredAuth().user;
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return getStoredAuth().token;
  });

  // Current Clinic Station
  const [deptCode, setDeptCode] = useState("P.102");

  // Queue State
  const [queue, setQueue] = useState<VisitQueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [activePatient, setActivePatient] = useState<VisitQueueItem | null>(null);

  // Clinical Entry State
  const [bloodPressure, setBloodPressure] = useState("120/80");
  const [heartRate, setHeartRate] = useState(82);
  const [temperature, setTemperature] = useState(37.2);
  const [spO2, setSpO2] = useState(98);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([
    "Đau âm ỉ vùng thượng vị",
    "Ợ chua / Trào ngược dạ dày",
  ]);
  const [workingDiagnosis, setWorkingDiagnosis] = useState("Theo dõi Viêm loét dạ dày - tá tràng");
  const [clinicalNotes, setClinicalNotes] = useState(
    "Đau tăng sau khi ăn đồ cay nóng. Chỉ định cận lâm sàng đánh giá niêm mạc."
  );

  // Orders State
  const [selectedOrders, setSelectedOrders] = useState<string[]>(["P.201", "P.104", "P.302"]);
  const [pregnancySuspected, setPregnancySuspected] = useState(false);
  const [isStat, setIsStat] = useState(false);

  // DAG Result State
  const [submittingOrders, setSubmittingOrders] = useState(false);
  const [dagResult, setDagResult] = useState<DagResponse | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  // Quick Doctor Login Helper
  const handleQuickDoctorLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "doctor@hospital.vn",
          password: "Password123!",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Đăng nhập thất bại");
      saveAuth(data);
      setCurrentUser(data.user);
      setAuthToken(data.accessToken);
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Không thể đăng nhập bác sĩ");
    }
  };

  // Queue Fetching (Manual)
  const fetchQueue = useCallback(async () => {
    if (!authToken) return;
    setLoadingQueue(true);
    try {
      const res = await fetch(`${API_URL}/visits/queue?deptCode=${deptCode}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setQueue(data);
        // If an in-service patient is in queue, auto-select
        const currentInService = data.find((v) => v.status === "IN_SERVICE");
        if (currentInService && !activePatient) {
          setActivePatient(currentInService);
        }
      }
    } catch {
      // Ignore background errors
    } finally {
      setLoadingQueue(false);
    }
  }, [authToken, API_URL, deptCode, activePatient]);

  // Initial Queue Load
  useEffect(() => {
    let isMounted = true;
    if (!authToken) return;

    fetch(`${API_URL}/visits/queue?deptCode=${deptCode}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setQueue(data);
          const currentInService = data.find((v) => v.status === "IN_SERVICE");
          if (currentInService) {
            setActivePatient(currentInService);
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [authToken, API_URL, deptCode]);

  // Call Patient Action
  const handleCallPatient = async (visit: VisitQueueItem) => {
    if (!authToken) return;
    setOrderError(null);
    try {
      const res = await fetch(`${API_URL}/visits/${visit.id}/call`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Không thể gọi bệnh nhân");
      }
      setActivePatient(data);
      setDagResult(null);
      fetchQueue();
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Lỗi khi gọi bệnh nhân");
    }
  };

  // Toggle order checkbox
  const toggleOrder = (code: string) => {
    setSelectedOrders((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Toggle symptom chip
  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  // Submit Orders and Trigger Kahn DAG Algorithm
  const handleSubmitOrders = async () => {
    if (!activePatient) {
      setOrderError("Chưa chọn bệnh nhân để chỉ định y lệnh!");
      return;
    }
    if (selectedOrders.length === 0 && !isStat) {
      setOrderError("Vui lòng chọn ít nhất 1 trạm cận lâm sàng.");
      return;
    }

    setSubmittingOrders(true);
    setOrderError(null);

    try {
      const payloadSymptoms = [...selectedSymptoms];
      if (isStat) {
        payloadSymptoms.push("Đau ngực cấp STAT (Nghi nhồi máu cơ tim)");
      }

      const res = await fetch(`${API_URL}/visits/${activePatient.id}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          orders: selectedOrders,
          symptoms: payloadSymptoms,
          vitals: {
            bloodPressure,
            heartRate,
            temperature,
            spO2,
          },
          workingDiagnosis,
          pregnancySuspected,
          notes: clinicalNotes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg =
          data.message ||
          (Array.isArray(data.message) ? data.message.join(", ") : null) ||
          "Lỗi khởi tạo đồ thị DAG";
        throw new Error(errorMsg);
      }

      setDagResult(data);
      fetchQueue();
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tạo y lệnh");
    } finally {
      setSubmittingOrders(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Cockpit Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-2.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Doctor Info */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-sky-600/10 text-sky-600 flex items-center justify-center font-bold hover:bg-sky-600/20 transition-colors"
              title="Về Cổng Đăng nhập"
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
                  Bàn Khám Bác Sĩ Lâm Sàng (Screen S5)
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                  CLINICAL COCKPIT
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Khoa Khám Bệnh &bull; Điều Phối Cận Lâm Sàng Kahn DAG
              </p>
            </div>
          </div>

          {/* Clinic Station Selector & User Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
              <span className="text-[11px] text-slate-500 font-semibold pl-2">Phòng khám:</span>
              <select
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value)}
                className="bg-white border border-slate-200 font-bold text-sky-900 px-2.5 py-1 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="P.102">P.102 - Nội tổng quát</option>
                <option value="P.105">P.105 - Tim mạch &amp; Điện tim</option>
                <option value="P.108">P.108 - Tiêu hóa</option>
              </select>
            </div>

            {currentUser ? (
              <div className="flex items-center gap-2 text-xs bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-800">
                  {currentUser.name || currentUser.email}
                </span>
                <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded border border-sky-200">
                  PHYSICIAN
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleQuickDoctorLogin}
                className="text-xs font-bold text-sky-800 bg-sky-100 hover:bg-sky-200 border border-sky-300 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                ⚡ 1-Click Đăng nhập Bác sĩ
              </button>
            )}

            <Link
              href="/nurse"
              className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              &larr; Tiếp Nhận S0
            </Link>

            <button
              type="button"
              onClick={() => {
                clearAuth();
                setCurrentUser(null);
                setAuthToken(null);
                router.push("/");
              }}
              className="text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              Thoát
            </button>
          </div>
        </div>
      </header>

      {/* Main Split-Screen Cockpit */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN (4 Cols): Live Queue & Patient Calling */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col h-full min-h-[600px]">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h2 className="text-sm font-bold text-slate-900">
                  Hàng Đợi Phòng Khám [{deptCode}]
                </h2>
              </div>
              <button
                type="button"
                onClick={fetchQueue}
                disabled={loadingQueue}
                className="text-xs text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                <svg
                  className={`w-3 h-3 ${loadingQueue ? "animate-spin" : ""}`}
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
                {queue.length} người
              </button>
            </div>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
              {queue.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-center text-slate-400 p-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold">
                    Hiện chưa có bệnh nhân nào trong hàng đợi [{deptCode}]
                  </p>
                  <Link
                    href="/nurse"
                    className="text-xs text-emerald-600 font-bold hover:underline mt-2 inline-block"
                  >
                    + Sang bàn Tiếp Nhận S0 tạo lượt khám mới
                  </Link>
                </div>
              ) : (
                queue.map((item) => {
                  const isActive = activePatient?.id === item.id;
                  const isWaiting = item.status === "WAITING";

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isActive
                          ? "bg-sky-50/80 border-sky-300 shadow-sm ring-2 ring-sky-500/20"
                          : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-11 h-9 rounded-lg bg-slate-900 text-white font-mono font-black text-xs flex items-center justify-center text-emerald-400 shadow-inner">
                            {item.ticketNumber}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block leading-tight">
                              {item.patient?.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {item.patient?.phone}
                            </span>
                          </div>
                        </div>

                        {isWaiting ? (
                          <button
                            type="button"
                            onClick={() => handleCallPatient(item)}
                            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                              />
                            </svg>
                            GỌI VÀO
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                            Đang khám
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 mt-2 line-clamp-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        {item.chiefComplaint}
                      </p>

                      {item.patient?.allergies && item.patient.allergies.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                            Dị ứng: {item.patient.allergies.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Currently Active Patient Highlight */}
            {activePatient && (
              <div className="pt-3 border-t border-slate-200">
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    BỆNH NHÂN TRONG PHÒNG KHÁM
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-bold text-slate-900">
                      {activePatient.patient?.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {activePatient.ticketNumber}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (8 Cols): Clinical Entry & Kahn DAG Engine */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            {!activePatient ? (
              <div className="h-96 flex flex-col items-center justify-center text-center text-slate-400 p-8">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-800">Chưa có bệnh nhân nào được gọi</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Hãy bấm nút &quot;GỌI VÀO&quot; ở danh sách hàng đợi bên trái để bắt đầu khám lâm
                  sàng và chỉ định cận lâm sàng.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Patient Header Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-2xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-white">
                        {activePatient.patient?.name}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                        {activePatient.ticketNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      SĐT: {activePatient.patient?.phone} &bull; Lý do:{" "}
                      {activePatient.chiefComplaint}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Thời gian vào khám</span>
                    <span className="text-xs font-mono font-bold text-sky-400">
                      {new Date().toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Section 1: Vital Signs & Symptoms */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      1. Khám Lâm Sàng &amp; Chỉ Số Sinh Tồn
                    </h3>
                    <span className="text-[11px] text-slate-400">Vitals &amp; Symptoms</span>
                  </div>

                  {/* Vitals Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        Huyết áp (mmHg)
                      </span>
                      <input
                        type="text"
                        value={bloodPressure}
                        onChange={(e) => setBloodPressure(e.target.value)}
                        className="w-full text-sm font-bold font-mono text-slate-900 bg-transparent focus:outline-none"
                      />
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        Nhịp tim (bpm)
                      </span>
                      <input
                        type="number"
                        value={heartRate}
                        onChange={(e) => setHeartRate(Number(e.target.value))}
                        className="w-full text-sm font-bold font-mono text-slate-900 bg-transparent focus:outline-none"
                      />
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        Nhiệt độ (°C)
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(Number(e.target.value))}
                        className="w-full text-sm font-bold font-mono text-slate-900 bg-transparent focus:outline-none"
                      />
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        SpO2 (%)
                      </span>
                      <input
                        type="number"
                        value={spO2}
                        onChange={(e) => setSpO2(Number(e.target.value))}
                        className="w-full text-sm font-bold font-mono text-slate-900 bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Symptom Chips */}
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Triệu chứng ghi nhận:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SYMPTOM_OPTIONS.map((sym) => {
                        const checked = selectedSymptoms.includes(sym);
                        return (
                          <button
                            key={sym}
                            type="button"
                            onClick={() => toggleSymptom(sym)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                              checked
                                ? "bg-sky-600 text-white shadow-2xs"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {sym}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Diagnosis & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label
                        htmlFor="workingDiagnosisInput"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Chẩn đoán sơ bộ
                      </label>
                      <input
                        id="workingDiagnosisInput"
                        type="text"
                        value={workingDiagnosis}
                        onChange={(e) => setWorkingDiagnosis(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="clinicalNotesInput"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Ghi chú dặn dò lâm sàng
                      </label>
                      <input
                        id="clinicalNotesInput"
                        type="text"
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Paraclinical Station Selection */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      2. Chỉ Định Trạm Cận Lâm Sàng &amp; Ràng Buộc Sinh Lý
                    </h3>
                    <span className="text-[11px] text-sky-700 font-semibold">
                      Directed Acyclic Graph Inputs
                    </span>
                  </div>

                  {/* Order Station Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {AVAILABLE_ORDERS.map((order) => {
                      const isSelected = selectedOrders.includes(order.code);
                      return (
                        <div
                          key={order.code}
                          onClick={() => toggleOrder(order.code)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                            isSelected
                              ? "bg-sky-50/60 border-sky-300 shadow-2xs"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1 w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500/20"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 font-mono">
                                [{order.code}]
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                Tầng {order.floor}
                              </span>
                            </div>
                            <span className="text-xs text-slate-700 block font-medium mt-0.5">
                              {order.name}
                            </span>
                            <span className="text-[10px] font-semibold text-sky-800 bg-sky-100/60 px-1.5 py-0.2 rounded mt-1 inline-block">
                              {order.badge}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Triage Safety Checks */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                      Kiểm Soát An Toàn Người Bệnh (Safety Rules):
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pregnancySuspected}
                          onChange={(e) => setPregnancySuspected(e.target.checked)}
                          className="w-4 h-4 rounded border-amber-300 text-rose-600 focus:ring-rose-500/20"
                        />
                        <span className="text-slate-800 font-medium">
                          Nghi ngờ có thai (Kích hoạt bộ lọc bức xạ X-Quang)
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isStat}
                          onChange={(e) => setIsStat(e.target.checked)}
                          className="w-4 h-4 rounded border-amber-300 text-rose-600 focus:ring-rose-500/20"
                        />
                        <span className="text-rose-700 font-bold">
                          🚨 Ca Cấp Cứu STAT (Ngắt quãng đồ thị &rarr; Đưa về P.105)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Primary CTA: Formulate Kahn DAG */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={submittingOrders}
                      onClick={handleSubmitOrders}
                      className="w-full h-12 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-sky-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {submittingOrders ? (
                        <span>Đang chạy thuật toán Kahn &amp; khởi tạo DAG...</span>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>XÁC NHẬN &amp; KHỞI TẠO ĐỒ THỊ DAG</span>
                        </>
                      )}
                    </button>
                  </div>

                  {orderError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                      {orderError}
                    </div>
                  )}
                </div>

                {/* Section 3: Generated Kahn DAG Topology Display */}
                {dagResult && (
                  <div className="mt-4 p-5 bg-slate-900 text-white rounded-2xl space-y-4 animate-in fade-in duration-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                          KAHN DAG ENGINE &bull; KẾT QUẢ KHỞI TẠO THÀNH CÔNG
                        </span>
                        <h4 className="text-sm font-bold text-white">
                          Đồ thị luồng khám tối ưu G=(V, E)
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ACYCLIC (0 Chu Trình)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          {dagResult.vertices.length} ĐỈNH / {dagResult.edges.length} CUNG
                        </span>
                      </div>
                    </div>

                    {/* Safety alerts */}
                    {dagResult.safetyAlerts.length > 0 && (
                      <div className="p-3 bg-rose-950/80 border border-rose-700 text-rose-200 rounded-xl text-xs space-y-1">
                        {dagResult.safetyAlerts.map((alert, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-rose-400">⚠️</span>
                            <span>{alert}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Visual DAG Step Sequence */}
                    <div className="space-y-2">
                      <span className="text-xs text-slate-400 font-medium block">
                        Thứ tự topo thực thi (Topological Sequence):
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        {dagResult.steps.map((step, idx) => (
                          <div
                            key={step.id}
                            className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl relative"
                          >
                            <span className="text-[10px] font-mono font-bold text-sky-400 block mb-1">
                              BƯỚC {idx + 1} &bull; TẦNG {step.floor}
                            </span>
                            <span className="text-xs font-bold text-white font-mono block">
                              [{step.departmentCode}]
                            </span>
                            <span className="text-[11px] text-slate-300 line-clamp-1">
                              {step.departmentName}
                            </span>

                            {step.status === "CALLING" && (
                              <span className="mt-2 inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500 text-slate-950">
                                Đang kích hoạt
                              </span>
                            )}
                            {step.status === "PENDING" && (
                              <span className="mt-2 inline-block px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-700 text-slate-300">
                                Chờ hoàn thành bước trước
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Edge Dependencies Info */}
                    {dagResult.edges.length > 0 && (
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono space-y-1">
                        <span className="text-[11px] text-slate-400 font-bold block mb-1">
                          Danh sách cung ràng buộc (E):
                        </span>
                        {dagResult.edges.map((e, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-emerald-400">
                              {e.from} &rarr; {e.to}
                            </span>
                            <span className="text-slate-500">
                              ({e.type}): {e.reason}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Button to S3 Patient View */}
                    <div className="pt-2 flex justify-between items-center">
                      <span className="text-xs text-slate-400">
                        Phiếu khám và DAG đã đồng bộ vào hệ thống EMR.
                      </span>

                      <Link
                        href="/patient"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <span>Mở Lộ Trình Người Bệnh (Screen S3)</span>
                        <span>&rarr;</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
