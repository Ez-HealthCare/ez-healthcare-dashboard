import { PATIENT_NAVIGATION, ROUTES } from "@/lib/constants/routes";
import { notFound, redirect } from "next/navigation";
import { getPatientAccess } from "@/services/auth-session.server";
import { PatientDashboard } from "@/components/patient/patient-dashboard";
import {
  WorkspaceAccessDenied,
  SessionRecovery,
  SessionError,
} from "@/components/auth/workspace-state";

export default async function PatientPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section = [] } = await params;
  const tab = section.join("/");
  if (![...PATIENT_NAVIGATION.map(([key]) => key), "profile", "reception-request"].includes(tab))
    notFound();
  // Check each page, not just the layout, so unauthorized RSC requests are denied.
  const access = await getPatientAccess();
  if (access === "unauthenticated") redirect(ROUTES.LOGIN);
  if (access === "refresh-required") return <SessionRecovery />;
  if (access === "unavailable") return <SessionError />;
  if (access === "forbidden") return <WorkspaceAccessDenied />;
  return <PatientDashboard tab={tab} />;
}
