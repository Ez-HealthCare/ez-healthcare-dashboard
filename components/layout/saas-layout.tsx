"use client";

import { useState, type ReactNode } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export type SaasMenu = "dashboard" | "doctor" | "nurse" | "patient" | "users";

export interface SaasLayoutProps {
  children: ReactNode;
  activeMenu?: SaasMenu;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  pageTitle?: string;
  pageSubtitle?: string;
  actions?: ReactNode;
}

export function SaasLayout({
  children,
  activeMenu = "dashboard",
  breadcrumbs = [{ label: "Dashboard" }],
  pageTitle,
  pageSubtitle,
  actions,
}: SaasLayoutProps) {
  const [isDark, setIsDark] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="flex min-h-screen overflow-x-hidden bg-[#f8f9fc] text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
        <DashboardSidebar activeMenu={activeMenu} className="hidden lg:flex" />

        {isMobileNavOpen && (
          <>
            <button
              type="button"
              aria-label="Đóng menu điều hướng"
              className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
              onClick={() => setIsMobileNavOpen(false)}
            />
            <DashboardSidebar
              activeMenu={activeMenu}
              className="fixed inset-y-0 left-0 z-50 h-full w-[min(85vw,280px)] shadow-2xl lg:hidden"
            />
          </>
        )}

        <div className="min-w-0 flex-1">
          <DashboardHeader
            breadcrumbs={breadcrumbs}
            isDark={isDark}
            onToggleTheme={() => setIsDark((current) => !current)}
            onMenuToggle={() => setIsMobileNavOpen((current) => !current)}
          />

          <main className="mx-auto w-full max-w-[1600px] p-3 sm:p-5 lg:p-8">
            {(pageTitle || pageSubtitle || actions) && (
              <div className="mb-5 flex min-w-0 flex-col justify-between gap-4 sm:mb-7 sm:flex-row sm:items-end sm:gap-5">
                <div className="min-w-0">
                  {pageTitle && (
                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                      <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">
                        {pageTitle}
                      </h1>
                    </div>
                  )}
                  {pageSubtitle && (
                    <p className="mt-2 break-words text-sm text-slate-500 dark:text-slate-400">
                      {pageSubtitle}
                    </p>
                  )}
                </div>
                {actions && <div className="w-full min-w-0 sm:w-auto sm:max-w-full">{actions}</div>}
              </div>
            )}

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
