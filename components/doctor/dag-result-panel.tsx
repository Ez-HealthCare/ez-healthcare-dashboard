import Link from "next/link";
import type { DagResponse } from "@/lib/types/clinical";
import { ROUTES } from "@/lib/constants/routes";

export interface DagResultPanelProps {
  dagResult: DagResponse | null;
}

export function DagResultPanel({ dagResult }: DagResultPanelProps) {
  if (!dagResult) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <span className="block font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            KAHN DAG ENGINE &bull; KẾT QUẢ KHỞI TẠO THÀNH CÔNG
          </span>
          <h3 className="text-sm font-bold text-white">
            KẾT QUẢ ĐIỀU PHỐI ĐỒ THỊ DAG (KAHN ALGORITHM)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-xl border px-2 py-0.5 text-[11px] font-mono font-bold ${
              dagResult.isAcyclic
                ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                : "border-rose-500/30 bg-rose-500/20 text-rose-300"
            }`}
          >
            {dagResult.isAcyclic ? "ACYCLIC" : "CYCLIC"}
          </span>
          <span className="rounded-xl border border-sky-500/30 bg-sky-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-sky-400">
            |V| {dagResult.vertices.length}
          </span>
          <span className="rounded-xl border border-sky-500/30 bg-sky-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-sky-400">
            |E| {dagResult.edges.length}
          </span>
        </div>
      </div>

      {dagResult.safetyAlerts.length > 0 && (
        <div className="space-y-1 rounded-xl border border-rose-700 bg-rose-950/80 p-3 text-xs text-rose-200">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-rose-300">
            Cảnh báo an toàn người bệnh
          </span>
          {dagResult.safetyAlerts.map((alert, index) => (
            <div key={`${alert}-${index}`} className="flex items-start gap-2">
              <span className="text-rose-400" aria-hidden="true">
                ⚠️
              </span>
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <span className="block text-xs font-medium text-slate-400">
          Thứ tự topo thực thi (Topological Sequence):
        </span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {dagResult.steps.map((step, index) => (
            <div
              key={step.id}
              className="relative rounded-xl border border-slate-700 bg-slate-800/80 p-3"
            >
              <span className="mb-1 block font-mono text-[10px] font-bold text-sky-400">
                BƯỚC {String(index + 1).padStart(2, "0")} &bull; TẦNG {step.floor}
              </span>
              <span className="block font-mono text-xs font-bold text-white">
                [{step.departmentCode}]
              </span>
              <span className="block line-clamp-1 text-[11px] text-slate-300">
                {step.departmentName}
              </span>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {step.status === "CALLING" ? (
                  <span className="rounded-xl bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                    CALLING
                  </span>
                ) : step.status === "PENDING" ? (
                  <span className="rounded-xl bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                    PENDING
                  </span>
                ) : (
                  <span className="rounded-xl bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                    {step.status}
                  </span>
                )}
                {step.prerequisiteCode && (
                  <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                    Sau {step.prerequisiteCode}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {dagResult.edges.length > 0 && (
        <div className="space-y-1 rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-300">
          <span className="mb-1 block font-sans text-[11px] font-bold text-slate-400">
            Danh sách cung ràng buộc (E):
          </span>
          {dagResult.edges.map((edge, index) => (
            <div
              key={`${edge.from}-${edge.to}-${index}`}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="text-emerald-400">
                {edge.from} &rarr; {edge.to}
              </span>
              <span className="text-slate-500">
                ({edge.type}): {edge.reason}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-800 pt-3 sm:flex-row sm:items-center">
        <span className="text-xs text-slate-400">
          Phiếu khám và DAG đã đồng bộ vào hệ thống EMR.
        </span>
        <Link
          href={ROUTES.LEGACY_PATIENT}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-500"
        >
          <span>Mở Lộ Trình Người Bệnh (Screen S3)</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </section>
  );
}
