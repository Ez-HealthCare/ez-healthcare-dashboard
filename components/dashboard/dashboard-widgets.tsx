"use client";

import { useState } from "react";
import { STAT_TONE_STYLES } from "@/lib/constants/theme";
import {
  ACTIVITY_DATA,
  ACTIVITY_LABELS,
  ACTIVITY_PERIODS,
  ACTIVITY_GRID_LINES,
  TOKEN_VALUES,
} from "@/lib/constants/dashboard";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  detailTone: "indigo" | "emerald" | "amber" | "violet";
  icon: ReactNode;
}

export function StatCard({ label, value, detail, detailTone, icon }: StatCardProps) {
  const styles = STAT_TONE_STYLES[detailTone];
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/40 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-[28px] font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles.icon}`}>
          {icon}
        </span>
      </div>
      <p className={`mt-3 text-[11px] font-semibold ${styles.detail}`}>{detail}</p>
    </article>
  );
}

function ChatStatIcon() {
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

function GlobeIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3 12h18M12 3c2.1 2.35 3.15 5.35 3.15 9S14.1 18.65 12 21c-2.1-2.35-3.15-5.35-3.15-9S9.9 5.35 12 3z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function DashboardStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        detailTone="indigo"
        detail="↑ 12.5% from last month"
        icon={<ChatStatIcon />}
        label="Total Visits"
        value="247"
      />
      <StatCard
        detailTone="emerald"
        detail="↑ 2 clinics this month"
        icon={<GlobeIcon />}
        label="Active Clinics"
        value="8"
      />
      <StatCard
        detailTone="amber"
        detail="↓ 24s from yesterday"
        icon={<ClockIcon />}
        label="Avg Waiting Time"
        value="3m 9s"
      />
      <StatCard
        detailTone="violet"
        detail="↑ 8.2% this week"
        icon={<SparkIcon />}
        label="DAG Dispatched"
        value="45.7K"
      />
    </div>
  );
}

export function PatientActivityChart() {
  const [period, setPeriod] = useState("Daily");
  const points = ACTIVITY_DATA.map(
    (value, index) => `${42 + index * 70},${176 - value * 1.7}`
  ).join(" ");
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Patient Activity</h2>
          <p className="mt-1 text-xs text-slate-400">Patient visits across all clinical stations</p>
        </div>
        <div className="flex rounded-lg bg-slate-50 p-1 text-[11px] font-semibold text-slate-400">
          {ACTIVITY_PERIODS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={`rounded-md px-2.5 py-1.5 transition-colors ${period === item ? "bg-white text-indigo-600 shadow-sm" : "hover:text-slate-600"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 h-[235px] w-full">
        <svg
          aria-label="Patient activity line chart"
          className="h-full w-full overflow-visible"
          role="img"
          viewBox="0 0 500 215"
          preserveAspectRatio="none"
        >
          {ACTIVITY_GRID_LINES.map((y) => (
            <line key={y} x1="25" x2="490" y1={y} y2={y} stroke="#eef2f7" strokeWidth="1" />
          ))}
          <path d={`M ${points} L 462 198 L 42 198 Z`} fill="url(#activityFill)" opacity="0.25" />
          <polyline
            fill="none"
            points={points}
            stroke="#6366f1"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          {ACTIVITY_DATA.map((value, index) => (
            <circle
              key={ACTIVITY_LABELS[index]}
              cx={42 + index * 70}
              cy={176 - value * 1.7}
              fill="white"
              r="4.5"
              stroke="#6366f1"
              strokeWidth="2.5"
            />
          ))}
          <defs>
            <linearGradient id="activityFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#818cf8" />
              <stop offset="1" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ACTIVITY_LABELS.map((label, index) => (
            <text
              key={label}
              fill="#94a3b8"
              fontSize="10"
              textAnchor="middle"
              x={42 + index * 70}
              y="213"
            >
              {label}
            </text>
          ))}
        </svg>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
        <span className="h-2 w-2 rounded-full bg-indigo-500" /> Completed visits{" "}
        <span className="ml-3 font-semibold text-slate-700">247 total</span>
      </div>
    </section>
  );
}

export function ContainmentRateChart() {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
      <div>
        <h2 className="text-base font-bold text-slate-900">Containment Rate</h2>
        <p className="mt-1 text-xs text-slate-400">DAG routing performance</p>
      </div>
      <div className="relative mx-auto mt-6 flex h-52 w-52 items-center justify-center">
        <svg
          aria-label="91 percent containment rate"
          className="h-full w-full -rotate-90"
          role="img"
          viewBox="0 0 120 120"
        >
          <circle cx="60" cy="60" fill="none" r="49" stroke="#ecfdf5" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            fill="none"
            r="49"
            stroke="#10b981"
            strokeDasharray="280 308"
            strokeLinecap="round"
            strokeWidth="12"
          />
        </svg>
        <div className="absolute text-center">
          <p className="text-4xl font-bold tracking-tight text-slate-900">91%</p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">AI Resolved</p>
        </div>
      </div>
      <p className="mx-auto mt-2 max-w-[260px] text-center text-xs leading-5 text-slate-400">
        91% of clinical routes are successfully handled by Kahn DAG without manual intervention
      </p>
      <div className="mt-5 flex justify-center gap-5 text-[11px] font-medium text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Automated
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-50" />
          Manual review
        </span>
      </div>
    </section>
  );
}

export function TokenUsageChart() {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Token Usage</h2>
          <p className="mt-1 text-xs text-slate-400">AI routing tokens used this week</p>
        </div>
        <span className="text-sm font-bold text-violet-600">8.4M</span>
      </div>
      <div className="mt-7 flex h-32 items-end gap-2 sm:gap-3">
        {TOKEN_VALUES.map((value, index) => (
          <div key={index} className="group flex h-full flex-1 items-end">
            <div
              className={`w-full rounded-t-md transition-all group-hover:bg-violet-500 ${index === 5 ? "bg-violet-500" : "bg-violet-100"}`}
              style={{ height: `${value}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-slate-400">
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
        <span>Sun</span>
      </div>
    </section>
  );
}

export function UserFeedbackChart() {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">User Feedback</h2>
          <p className="mt-1 text-xs text-slate-400">Clinical team satisfaction</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">
          Good
        </span>
      </div>
      <div className="mt-7 space-y-5">
        <div>
          <div className="mb-2 flex justify-between text-xs">
            <span className="font-semibold text-slate-600">Helpful</span>
            <span className="font-bold text-emerald-600">42%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-[42%] rounded-full bg-emerald-400" />
          </div>
        </div>
        <div>
          <div className="mb-2 flex justify-between text-xs">
            <span className="font-semibold text-slate-600">Not Helpful</span>
            <span className="font-bold text-rose-500">8%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-[8%] rounded-full bg-rose-400" />
          </div>
        </div>
      </div>
      <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
        <span className="font-bold text-slate-700">50%</span> of users gave feedback this week
      </div>
    </section>
  );
}
