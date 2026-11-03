import { notFound, redirect } from "next/navigation";
import { RoleWorkspace } from "@/components/dashboard/role-workspace";
import {
  SessionError,
  SessionRecovery,
  WorkspaceAccessDenied,
} from "@/components/auth/workspace-state";
import { isWorkspace, isWorkspaceSection } from "@/lib/constants/workspaces";
import { ROUTES } from "@/lib/constants/routes";
import { getWorkspaceAccess } from "@/services/auth-session.server";
import { doctorLegacyDestination } from "@/lib/doctor-navigation";

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; section?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace, section = [] } = await params;
  if (!isWorkspace(workspace) || workspace === "patient") notFound();
  const tab = section.join("/");
  if (!isWorkspaceSection(workspace, tab)) notFound();
  const access = await getWorkspaceAccess(workspace);
  if (access === "unauthenticated") redirect(ROUTES.LOGIN);
  if (access === "refresh-required") return <SessionRecovery />;
  if (access === "unavailable") return <SessionError />;
  if (access === "forbidden") return <WorkspaceAccessDenied />;
  if (workspace === "doctor") {
    const destination = doctorLegacyDestination(tab, await searchParams);
    if (destination) redirect(destination);
  }
  return <RoleWorkspace workspace={workspace} section={tab} />;
}
