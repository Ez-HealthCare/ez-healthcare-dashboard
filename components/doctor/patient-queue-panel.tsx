import Link from "next/link";
import type { VisitQueueItem } from "@/lib/types/clinical";
import { ROUTES } from "@/lib/constants/routes";

export interface PatientQueuePanelProps {
  deptCode: string;
  queue: VisitQueueItem[];
  loadingQueue: boolean;
  activePatient: VisitQueueItem | null;
  onRefresh: () => void;
  onCallPatient: (patientId: string) => Promise<void>;
  isCalling?: boolean;
}

export function PatientQueuePanel({
  deptCode,
  queue,
  loadingQueue,
  activePatient,
  onRefresh,
  onCallPatient,
  isCalling = false,
}: PatientQueuePanelProps) {
  return (
    <section className="flex min-h-[600px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-ping rounded-full bg-emerald-500" />
          <h2 className="text-sm font-bold text-slate-900">Hàng Đợi Phòng Khám [{deptCode}]</h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loadingQueue}
          className="flex cursor-pointer items-center gap-1 rounded-xl bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            className={`h-3 w-3 ${loadingQueue ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
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

      <div className="flex-1 space-y-2.5 overflow-y-auto py-3 pr-1">
        {queue.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center p-4 text-center text-slate-400">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
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
              href={ROUTES.LEGACY_NURSE}
              className="mt-2 inline-block text-xs font-bold text-emerald-600 hover:underline"
            >
              + Sang bàn Tiếp Nhận S0 tạo lượt khám mới
            </Link>
          </div>
        ) : (
          queue.map((item) => {
            const isActive = activePatient?.id === item.id;
            const isWaiting = item.status === "WAITING";
            const isInService = item.status === "IN_SERVICE";

            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-3.5 transition-all ${
                  isActive
                    ? "border-sky-300 bg-sky-50/80 shadow-sm ring-2 ring-sky-500/20"
                    : "border-slate-200/90 bg-white shadow-2xs hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-11 items-center justify-center rounded-xl bg-slate-900 font-mono text-xs font-black text-emerald-400 shadow-inner">
                      {item.ticketNumber}
                    </span>
                    <div>
                      <span className="block text-xs font-bold leading-tight text-slate-900">
                        {item.patient.name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {item.patient.phone}
                      </span>
                    </div>
                  </div>

                  {isWaiting ? (
                    <button
                      type="button"
                      onClick={() => onCallPatient(item.id)}
                      disabled={isCalling}
                      className="flex shrink-0 cursor-pointer items-center gap-1 rounded-xl bg-sky-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                        />
                      </svg>
                      {isCalling ? "ĐANG GỌI" : "GỌI VÀO"}
                    </button>
                  ) : isInService ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Đang khám
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      Đã hoàn tất
                    </span>
                  )}
                </div>

                <p className="mt-2 line-clamp-1 rounded-xl border border-slate-100 bg-slate-50 p-1.5 text-[11px] text-slate-600">
                  {item.chiefComplaint}
                </p>

                {item.patient.allergies && item.patient.allergies.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1">
                    <span className="rounded-xl border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                      Dị ứng: {item.patient.allergies.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {activePatient && (
        <div className="border-t border-slate-200 pt-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              BỆNH NHÂN TRONG PHÒNG KHÁM
            </span>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">{activePatient.patient.name}</span>
              <span className="font-mono text-xs font-bold text-emerald-700">
                {activePatient.ticketNumber}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
