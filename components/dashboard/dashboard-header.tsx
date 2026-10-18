"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/auth/auth-gate";
import { useIdentity } from "@/hooks/use-auth-session";
import { ROLE_LABELS } from "@/lib/constants/auth";
import { ROUTES } from "@/lib/constants/routes";

export interface DashboardBreadcrumb {
  label: string;
  href?: string;
}

interface DashboardHeaderProps {
  breadcrumbs?: DashboardBreadcrumb[];
  isDark: boolean;
  onToggleTheme: () => void;
  onMenuToggle?: () => void;
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 10.5L12 3l9 7.5M5.5 9v11h13V9M9.5 20v-6h5v6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M18 9a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M20.5 15.2A8.5 8.5 0 018.8 3.5 8.5 8.5 0 1020.5 15.2z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function DashboardHeader({
  breadcrumbs = [{ label: "Dashboard" }],
  isDark,
  onToggleTheme,
  onMenuToggle,
}: DashboardHeaderProps) {
  const user = useIdentity();
  return (
    <header className="flex min-h-20 min-w-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-3 sm:px-5 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 overflow-hidden text-sm text-slate-400">
        {onMenuToggle && (
          <button
            type="button"
            aria-label="Mở menu điều hướng"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-50 hover:text-indigo-600 lg:hidden"
            onClick={onMenuToggle}
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        )}
        <Link
          href={ROUTES.LOGIN}
          aria-label="Home"
          className="shrink-0 transition-colors hover:text-indigo-600"
        >
          <HomeIcon />
        </Link>
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap">
          {breadcrumbs.map((breadcrumb, index) => (
            <span
              key={`${breadcrumb.label}-${index}`}
              className="flex min-w-0 shrink-0 items-center gap-2"
            >
              <span>/</span>
              {breadcrumb.href ? (
                <Link
                  href={breadcrumb.href}
                  className="truncate font-medium transition-colors hover:text-indigo-600"
                >
                  {breadcrumb.label}
                </Link>
              ) : (
                <span className="truncate font-medium text-slate-600">{breadcrumb.label}</span>
              )}
            </span>
          ))}
          <span className="ml-1 hidden shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-600 sm:inline-flex">
            {ROLE_LABELS[user.role]}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
        <button
          type="button"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={isDark}
          onClick={onToggleTheme}
          className="flex h-9 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 text-slate-400 transition-colors hover:border-indigo-200 hover:text-indigo-600"
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${!isDark ? "bg-white text-amber-500 shadow-sm" : ""}`}
          >
            <SunIcon />
          </span>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${isDark ? "bg-slate-800 text-indigo-300 shadow-sm" : ""}`}
          >
            <MoonIcon />
          </span>
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
        >
          <BellIcon />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
        </button>
        <button
          type="button"
          className="hidden items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 sm:flex"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
          Live Queue
        </button>
        <div className="flex items-center gap-2 border-l border-slate-100 pl-1.5 sm:pl-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-md shadow-indigo-500/20">
            {(user.name || user.email).slice(0, 1).toUpperCase()}
          </span>
          <div className="hidden min-w-0 text-xs sm:block">
            <p className="max-w-40 truncate font-semibold text-slate-700">
              {user.name || user.email}
            </p>
            <p className="text-slate-500" data-testid="identity-role">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
