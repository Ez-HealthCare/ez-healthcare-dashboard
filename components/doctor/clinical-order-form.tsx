import type { VisitQueueItem } from "@/lib/types/clinical";
import { AVAILABLE_ORDERS, SYMPTOM_OPTIONS } from "@/lib/constants/doctor";

export interface ClinicalFormState {
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  spO2: number;
  selectedSymptoms: string[];
  workingDiagnosis: string;
  clinicalNotes: string;
  selectedOrders: string[];
  pregnancySuspected: boolean;
  isStat: boolean;
}

export interface ClinicalOrderFormProps {
  activePatient: VisitQueueItem | null;
  formState: ClinicalFormState;
  receivedAt?: string;
  onFieldChange: <K extends keyof ClinicalFormState>(key: K, value: ClinicalFormState[K]) => void;
  onToggleSymptom: (symptom: string) => void;
  onToggleOrder: (orderCode: string) => void;
  onPregnancySuspectedChange: (value: boolean) => void;
  onStatChange: (value: boolean) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  orderError: string | null;
}

import { CLINICAL_INPUT_CLASS_NAME } from "@/lib/constants/theme";

export function ClinicalOrderForm({
  activePatient,
  formState,
  receivedAt = "--:--",
  onFieldChange,
  onToggleSymptom,
  onToggleOrder,
  onPregnancySuspectedChange,
  onStatChange,
  onSubmit,
  isSubmitting,
  orderError,
}: ClinicalOrderFormProps) {
  if (!activePatient) {
    return (
      <div className="flex h-96 flex-col items-center justify-center p-8 text-center text-slate-400">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
          <svg
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-slate-800">Chưa có bệnh nhân nào được gọi</h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          Hãy bấm nút <strong>GỌI VÀO</strong> ở danh sách hàng đợi bên trái để bắt đầu khám lâm
          sàng và chỉ định cận lâm sàng.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 p-4 text-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-white">
              {activePatient.patient.name}
            </span>
            <span className="rounded border border-emerald-800 bg-emerald-950/80 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400">
              {activePatient.ticketNumber}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            SĐT: {activePatient.patient.phone} &bull; Lý do: {activePatient.chiefComplaint}
          </p>
        </div>

        <div className="text-right">
          <span className="block text-[11px] text-slate-400">Thời gian vào khám</span>
          <span className="font-mono text-xs font-bold text-sky-400">{receivedAt}</span>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            1. Khám Lâm Sàng & Chỉ Số Sinh Tồn
          </h3>
          <span className="text-[11px] text-slate-400">Vitals & Symptoms</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <VitalInput
            label="Huyết áp (mmHg)"
            type="text"
            value={formState.bloodPressure}
            onChange={(value) => onFieldChange("bloodPressure", String(value))}
          />
          <VitalInput
            label="Nhịp tim (bpm)"
            type="number"
            value={formState.heartRate}
            onChange={(value) => onFieldChange("heartRate", Number(value))}
          />
          <VitalInput
            label="Nhiệt độ (°C)"
            type="number"
            step="0.1"
            value={formState.temperature}
            onChange={(value) => onFieldChange("temperature", Number(value))}
          />
          <VitalInput
            label="SpO2 (%)"
            type="number"
            value={formState.spO2}
            onChange={(value) => onFieldChange("spO2", Number(value))}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">
            Triệu chứng ghi nhận:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SYMPTOM_OPTIONS.map((symptom) => {
              const checked = formState.selectedSymptoms.includes(symptom);
              return (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => onToggleSymptom(symptom)}
                  className={`cursor-pointer rounded-xl px-2.5 py-1 text-xs font-medium transition-colors ${
                    checked
                      ? "bg-sky-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  aria-pressed={checked}
                >
                  {symptom}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="block text-xs font-semibold text-slate-700">Chẩn đoán sơ bộ</span>
            <input
              type="text"
              value={formState.workingDiagnosis}
              onChange={(event) => onFieldChange("workingDiagnosis", event.target.value)}
              className={`${CLINICAL_INPUT_CLASS_NAME} h-9`}
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-semibold text-slate-700">
              Ghi chú dặn dò lâm sàng
            </span>
            <input
              type="text"
              value={formState.clinicalNotes}
              onChange={(event) => onFieldChange("clinicalNotes", event.target.value)}
              className={`${CLINICAL_INPUT_CLASS_NAME} h-9`}
            />
          </label>
        </div>
      </section>

      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            2. Chỉ Định Cận Lâm Sàng & An Toàn
          </h3>
          <span className="text-[11px] font-semibold text-sky-700">
            Directed Acyclic Graph Inputs
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {AVAILABLE_ORDERS.map((order) => {
            const isSelected = formState.selectedOrders.includes(order.code);
            return (
              <label
                key={order.code}
                className={`flex cursor-pointer items-start gap-2.5 rounded-2xl border p-3 transition-all ${
                  isSelected
                    ? "border-sky-300 bg-sky-50/60 shadow-2xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleOrder(order.code)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500/20"
                />
                <span className="flex-1">
                  <span className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      [{order.code}]
                    </span>
                    <span className="rounded-xl bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                      Tầng {order.floor}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-slate-700">
                    {order.name}
                  </span>
                  <span className="mt-1 inline-block rounded-xl bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    {order.badge}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-900">
            Kiểm Soát An Toàn Người Bệnh (Safety Rules):
          </span>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <CheckOption
              checked={formState.pregnancySuspected}
              onChange={onPregnancySuspectedChange}
              label="Nghi ngờ có thai (Kích hoạt bộ lọc bức xạ X-Quang)"
              CLINICAL_INPUT_CLASS_NAME="border-amber-300 text-rose-600 focus:ring-rose-500/20"
            />
            <CheckOption
              checked={formState.isStat}
              onChange={onStatChange}
              label="🚨 Ca Cấp Cứu STAT (Chuyển thẳng về P.001 Cấp cứu)"
              labelClassName="font-bold text-rose-700"
              CLINICAL_INPUT_CLASS_NAME="border-amber-300 text-rose-600 focus:ring-rose-500/20"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onSubmit}
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sky-600 text-sm font-bold text-white shadow-md shadow-sky-600/25 transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <span>ĐANG XỬ LÝ DAG (KAHN ALGORITHM)...</span>
            ) : (
              <>
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>XÁC NHẬN & KHỞI TẠO ĐỒ THỊ DAG</span>
              </>
            )}
          </button>
        </div>

        {orderError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
            {orderError}
          </div>
        )}
      </section>
    </div>
  );
}

interface VitalInputProps {
  label: string;
  type: "text" | "number";
  step?: string;
  value: string | number;
  onChange: (value: string) => void;
}

function VitalInput({ label, type, step, value, onChange }: VitalInputProps) {
  return (
    <label className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
      <span className="block text-[10px] font-semibold text-slate-500">{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent font-mono text-sm font-bold text-slate-900 focus:outline-none"
      />
    </label>
  );
}

interface CheckOptionProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  labelClassName?: string;
  CLINICAL_INPUT_CLASS_NAME?: string;
}

function CheckOption({
  checked,
  onChange,
  label,
  labelClassName = "font-medium text-slate-800",
  CLINICAL_INPUT_CLASS_NAME = "border-slate-300 text-sky-600 focus:ring-sky-500/20",
}: CheckOptionProps) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={`h-4 w-4 rounded ${CLINICAL_INPUT_CLASS_NAME}`}
      />
      <span className={labelClassName}>{label}</span>
    </label>
  );
}
