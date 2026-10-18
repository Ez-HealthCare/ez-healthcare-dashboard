import { ROUTES } from "@/lib/constants/routes";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { getDashboardSession } from "@/services/auth-session.server";
import { SessionError, SessionRecovery } from "@/components/auth/workspace-state";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getDashboardSession();
  if (session.state === "unauthenticated") redirect(ROUTES.LOGIN);
  if (session.state === "refresh-required") return <SessionRecovery />;
  if (session.state === "unavailable") return <SessionError />;
  // Every page also checks access; layouts can be reused across client navigations.
  return <AuthGate initialUser={session.user}>{children}</AuthGate>;
}
