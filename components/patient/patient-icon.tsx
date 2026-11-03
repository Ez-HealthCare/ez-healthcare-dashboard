import { PATIENT_ICON_PATHS } from "@/lib/constants/patient";

export function PatientIcon({ name }: { name: keyof typeof PATIENT_ICON_PATHS }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATIENT_ICON_PATHS[name]} />
    </svg>
  );
}
