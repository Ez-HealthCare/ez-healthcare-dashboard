import type { ClinicQueueItem } from "./types/clinical";
import type { VisitDossier } from "./types/doctor";

export function canWriteDoctorVisit(
  doctorId: string,
  patient: Pick<ClinicQueueItem, "status">,
  dossier?: Pick<VisitDossier, "status" | "currentDoctor">
) {
  return (
    !!doctorId &&
    patient.status === "IN_EXAMINATION" &&
    dossier?.status === "IN_EXAMINATION" &&
    dossier.currentDoctor?.id === doctorId
  );
}
