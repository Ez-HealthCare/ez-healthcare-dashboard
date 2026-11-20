type StaffWorkspace = "doctor" | "nurse" | "receptionist" | "admin";

export function notificationLink(workspace: StaffWorkspace, visitId?: string | null) {
  if (!visitId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitId))
    return undefined;
  if (workspace === "admin") return `/dashboard/admin`;
  return workspace === "receptionist"
    ? `/dashboard/receptionist/records?search=${encodeURIComponent(visitId)}`
    : workspace === "doctor"
      ? `/dashboard/doctor?visitId=${encodeURIComponent(visitId)}`
      : `/dashboard/nurse/queue?visitId=${encodeURIComponent(visitId)}`;
}
