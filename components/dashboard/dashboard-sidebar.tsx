import Link from "next/link";
import { useIdentity } from "@/hooks/use-auth-session";
import { ROLE_LABELS } from "@/lib/constants/auth";
import { DASHBOARD_NAVIGATION, type DashboardMenu } from "@/lib/constants/routes";
export type { DashboardMenu } from "@/lib/constants/routes";

interface DashboardSidebarProps {
  activeMenu?: DashboardMenu;
  className?: string;
}

function GridIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <rect height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="6" x="3" y="3" />
      <rect height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="6" x="15" y="3" />
      <rect height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="6" x="3" y="15" />
      <rect height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="6" x="15" y="15" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 21V5.5L12 3l8 2.5V21"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8 8h1m3-1h1m3 1h1M8 12h1m3-1h1m3 1h1M8 16h1m3-1h1m3 1h1M2 21h20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ClinicIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 9h.01M12 9h.01M15 9h.01M9 12h.01M12 12h.01M15 12h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M20 11.5a7.5 7.5 0 01-8 7.5 8.8 8.8 0 01-3.6-.76L4 20l1.65-3.8A7.25 7.25 0 014.5 12 7.5 7.5 0 0112 4.5a7.5 7.5 0 018 7z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 12h.01M12 12h.01M15.5 12h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <rect height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" width="17" x="3.5" y="5" />
      <path
        d="M8 3v4M16 3v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M4 19V5M4 19h17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path
        d="M7 15l3-4 3 2 5-6 2 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 20a5.5 5.5 0 0111 0M16 11a3 3 0 100-6M16 14.5a5.5 5.5 0 014.5 5.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9.7 9a2.35 2.35 0 114.22 1.42c-.76.96-1.92 1.16-1.92 2.58M12 16.5h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

const navigationIcons = {
  grid: GridIcon,
  building: BuildingIcon,
  clinic: ClinicIcon,
  chat: ChatIcon,
  calendar: CalendarIcon,
  chart: ChartIcon,
  users: UsersIcon,
};

export function DashboardSidebar({
  activeMenu = "dashboard",
  className = "",
}: DashboardSidebarProps) {
  const user = useIdentity();
  return (
    <aside
      className={`flex w-[250px] shrink-0 flex-col border-r border-slate-100 bg-white ${className}`}
    >
      <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-400 text-white shadow-lg shadow-indigo-500/20">
          <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path
              d="M12 3v18M3 12h18M5.64 5.64l12.72 12.72M18.36 5.64L5.64 18.36"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-extrabold tracking-tight text-slate-900">Ez-HealthCare</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-500">
            Cổng khám bệnh
          </p>
        </div>
      </div>

      <nav aria-label="Dashboard navigation" className="flex-1 px-3 py-6">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Workspace
        </p>
        <div className="space-y-1">
          {DASHBOARD_NAVIGATION.map((item) => {
            const Icon = navigationIcons[item.icon];
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all ${
                  item.menu === activeMenu
                    ? "bg-indigo-50 font-semibold text-indigo-600"
                    : "font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span
                  className={
                    item.menu === activeMenu
                      ? "text-indigo-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }
                >
                  <Icon />
                </span>
                <span>{item.label}</span>
                {item.menu === activeMenu && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="space-y-4 border-t border-slate-100 p-5">
        <Link
          href="#support"
          className="flex items-center gap-3 text-[13px] font-medium text-slate-500 transition-colors hover:text-indigo-600"
        >
          <HelpIcon />
          Help & Support
        </Link>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
              {(user.name || user.email).slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-700">
                {user.name || user.email}
              </p>
              <p className="truncate text-[10px] text-slate-500">{user.email}</p>
              <p className="truncate text-[10px] font-semibold text-indigo-600">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
