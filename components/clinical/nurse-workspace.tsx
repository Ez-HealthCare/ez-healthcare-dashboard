"use client";

import { StaffWorkspaceShell } from "@/components/layout/staff-workspace-shell";
import { NursePanel } from "./staff-clinical-panel";

export function NurseWorkspace({ section }: { section: string }) {
  return (
    <StaffWorkspaceShell workspace="nurse" section={section}>
      <NursePanel section={section} />
    </StaffWorkspaceShell>
  );
}
