"use client";

import { useState } from "react";

interface ScreenMeta {
  id: string;
  file: string;
  title: string;
  flow: string;
  device: "mobile" | "desktop";
  badge: string;
}

const SCREENS: ScreenMeta[] = [
  {
    id: "login",
    file: "/mock-screens/01_login.html",
    title: "01. Đăng Nhập Tinh Gọn",
    flow: "Xác thực (Auth)",
    device: "desktop",
    badge: "Centered Minimal",
  },
  {
    id: "triage",
    file: "/mock-screens/02_patient_triage.html",
    title: "02. Khảo Sát Triệu Chứng Triage",
    flow: "Bệnh Nhân (Patient)",
    device: "mobile",
    badge: "Apple Health Style",
  },
  {
    id: "gps",
    file: "/mock-screens/03_patient_gps_route.html",
    title: "03. GPS Lộ Trình Khám & Hàng Đợi",
    flow: "Bệnh Nhân (Patient)",
    device: "mobile",
    badge: "Flagship Feature",
  },
  {
    id: "emr",
    file: "/mock-screens/04_patient_emr_summary.html",
    title: "04. Kết Quả Khám & Đơn Thuốc",
    flow: "Bệnh Nhân (Patient)",
    device: "mobile",
    badge: "QR Prescription",
  },
  {
    id: "doctor",
    file: "/mock-screens/05_doctor_workspace.html",
    title: "05. Bàn Khám Bác Sĩ Lâm Sàng",
    flow: "Bác Sĩ (Physician)",
    device: "desktop",
    badge: "2-Column Linear",
  },
  {
    id: "lab",
    file: "/mock-screens/06_lab_station.html",
    title: "06. Trạm Cận Lâm Sàng & Lấy Mẫu",
    flow: "Kỹ Thuật Viên (Lab)",
    device: "desktop",
    badge: "Specimen Roster",
  },
  {
    id: "heatmap",
    file: "/mock-screens/07_operations_heatmap.html",
    title: "07. Bản Đồ Nhiệt Hàng Đợi (Heatmap)",
    flow: "Quản Trị (Command)",
    device: "desktop",
    badge: "Anti-Herd Metrics",
  },
  {
    id: "dag",
    file: "/mock-screens/08_dag_rules_builder.html",
    title: "08. Cấu Hình Đồ Thị DAG & Triage",
    flow: "Quản Trị (Command)",
    device: "desktop",
    badge: "Visual Node Graph",
  },
];

export default function MockTestViewer() {
  const [selectedScreen, setSelectedScreen] = useState<ScreenMeta>(SCREENS[2]); // Default to flagship GPS route
  const [forceMobileFrame, setForceMobileFrame] = useState<boolean>(false);

  const isMobile = forceMobileFrame || selectedScreen.device === "mobile";

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Floating Master Switcher Bar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white shadow-sm">
            EZ
          </div>
          <div>
            <div className="font-semibold text-sm flex items-center gap-2">
              <span>EZHealth EMR • Mock Screen Viewer</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                Nhánh: feat/mock
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Bộ 8 màn hình tinh gọn đã kéo từ Stitch MCP
            </div>
          </div>
        </div>

        {/* Viewport controls */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setForceMobileFrame(false)}
            className={`px-3 py-1.5 rounded-md transition font-medium cursor-pointer ${
              !forceMobileFrame
                ? "bg-slate-800 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🖥️ Chuẩn ({selectedScreen.device.toUpperCase()})
          </button>
          <button
            onClick={() => setForceMobileFrame(true)}
            className={`px-3 py-1.5 rounded-md transition font-medium cursor-pointer ${
              forceMobileFrame
                ? "bg-slate-800 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📱 Giả Lập Khung iPhone
          </button>
        </div>

        {/* External Link */}
        <a
          href={selectedScreen.file}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
        >
          <span>Mở Tab Riêng</span>
          <span>↗</span>
        </a>
      </header>

      {/* Screen Selection Sub-Bar */}
      <nav className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
        {SCREENS.map((s) => {
          const isCurrent = selectedScreen.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => {
                setSelectedScreen(s);
                setForceMobileFrame(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
                isCurrent
                  ? "bg-teal-600 text-white shadow-sm ring-1 ring-teal-400/50"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60"
              }`}
            >
              <span>{s.title}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                  isCurrent ? "bg-teal-800 text-teal-100" : "bg-slate-900 text-slate-400"
                }`}
              >
                {s.badge}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Main Preview Canvas */}
      <main className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-auto">
        {isMobile ? (
          /* Mobile Phone Mockup Frame */
          <div className="relative w-[400px] h-[844px] bg-slate-900 rounded-[50px] p-3 shadow-2xl border-4 border-slate-700 shrink-0 flex flex-col">
            {/* Speaker & Dynamic Island Notch */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-950 rounded-full z-20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-900 ml-auto mr-3" />
            </div>

            {/* Screen Content Iframe */}
            <div className="w-full h-full rounded-[38px] overflow-hidden bg-white">
              <iframe
                src={selectedScreen.file}
                title={selectedScreen.title}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        ) : (
          /* Full Desktop Viewport Frame */
          <div className="w-full h-full bg-white rounded-xl overflow-hidden shadow-xl border border-slate-800">
            <iframe
              src={selectedScreen.file}
              title={selectedScreen.title}
              className="w-full h-full border-0"
            />
          </div>
        )}
      </main>
    </div>
  );
}
