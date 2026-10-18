import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import type { UserProfile } from "@/lib/auth";

export interface DoctorHeaderProps {
  deptCode: string;
  onDeptChange: (deptCode: string) => void;
  currentUser: UserProfile | null;
  onQuickDoctorLogin?: () => void;
  onLogout: () => void;
}

import { CLINIC_STATIONS } from "@/lib/constants/doctor";

export function DoctorHeader({
  deptCode,
  onDeptChange,
  currentUser,
  onQuickDoctorLogin,
  onLogout,
}: DoctorHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-2.5 shadow-2xs sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.LOGIN}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 font-bold text-sky-600 transition-colors hover:bg-sky-100"
            title="Về Cổng Đăng nhập"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <h1 className="text-base font-extrabold leading-none text-slate-900">
                Bàn Khám Bác Sĩ Lâm Sàng (Screen S5)
              </h1>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                CLINICAL COCKPIT
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Khoa Khám Bệnh &bull; Điều Phối Cận Lâm Sàng Kahn DAG
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 text-xs">
            <span className="pl-2 text-[11px] font-semibold text-slate-500">Phòng khám:</span>
            <select
              value={deptCode}
              onChange={(event) => onDeptChange(event.target.value)}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-2.5 py-1 font-bold text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
              aria-label="Chọn phòng khám"
            >
              {CLINIC_STATIONS.map((station) => (
                <option key={station.code} value={station.code}>
                  {station.code} - {station.name}
                </option>
              ))}
            </select>
          </label>

          {currentUser ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-800">
                {currentUser.name || currentUser.email}
              </span>
              <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
                PHYSICIAN
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onQuickDoctorLogin}
              className="cursor-pointer rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-100"
            >
              ⚡ 1-Click Đăng nhập Bác sĩ
            </button>
          )}

          <Link
            href={ROUTES.LEGACY_NURSE}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            &larr; Tiếp Nhận S0
          </Link>

          <button
            type="button"
            onClick={onLogout}
            className="cursor-pointer rounded-xl border border-rose-200 px-2.5 py-1.5 text-xs text-rose-600 transition-colors hover:bg-rose-50"
          >
            Thoát
          </button>
        </div>
      </div>
    </header>
  );
}
