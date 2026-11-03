import type { ClinicQueueItem } from "./types/clinical";

export type DoctorView =
  "dashboard" | "clinical" | "orders" | "results" | "transfer" | "conclusion";
export const DOCTOR_LEGACY_SECTIONS = ["queue", "consultation"];
const views: DoctorView[] = [
  "dashboard",
  "clinical",
  "orders",
  "results",
  "transfer",
  "conclusion",
];

export function doctorInitialView(section: string, view?: string | null): DoctorView {
  return section === "results"
    ? "results"
    : views.includes(view as DoctorView)
      ? (view as DoctorView)
      : "dashboard";
}

export function doctorBoardLink(visitId?: string, view: DoctorView = "dashboard") {
  const params = new URLSearchParams();
  if (visitId) params.set("visitId", visitId);
  if (view !== "dashboard") params.set("view", view);
  return "/dashboard/doctor" + (params.size ? "?" + params.toString() : "");
}

export function doctorLegacyDestination(
  section: string,
  search: Record<string, string | string[] | undefined>
) {
  if (!DOCTOR_LEGACY_SECTIONS.includes(section)) return undefined;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value])
      params.append(key, item);
  }
  params.delete("view");
  if (section === "consultation") params.set("view", "clinical");
  return "/dashboard/doctor" + (params.size ? "?" + params.toString() : "");
}

export function doctorResultVisits(rows: ClinicQueueItem[]) {
  return rows.filter((row) => ["PARACLINICAL_PENDING", "RE_EXAM_CALLING"].includes(row.status));
}

export function selectDoctorVisit(
  rows: ClinicQueueItem[],
  doctorId: string,
  activeId: string,
  requestedVisit: string,
  editedPatient?: ClinicQueueItem,
  resultsOnly = false
) {
  const scoped = resultsOnly ? doctorResultVisits(rows) : rows;
  if (
    requestedVisit &&
    activeId === requestedVisit &&
    !scoped.some((row) => row.visitId === requestedVisit) &&
    !editedPatient
  )
    return undefined;
  return (
    scoped.find((row) => row.visitId === (activeId || editedPatient?.visitId)) ||
    (!resultsOnly ? editedPatient : undefined) ||
    scoped.find((row) => row.status === "IN_EXAMINATION" && row.currentDoctor?.id === doctorId) ||
    scoped.find((row) => row.status === "RE_EXAM_CALLING") ||
    scoped.find((row) => ["CLINIC_WAITING", "CLINIC_CALLED"].includes(row.status)) ||
    scoped[0]
  );
}
