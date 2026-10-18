// Prototype data only; not live clinical metrics.
export const ACTIVITY_DATA = [34, 48, 43, 68, 57, 76, 70] as const;
export const ACTIVITY_LABELS = ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"] as const;
export const ACTIVITY_PERIODS = ["Daily", "Weekly", "Monthly"] as const;
export const ACTIVITY_GRID_LINES = [32, 76, 120, 164] as const;
export const TOKEN_VALUES = [48, 70, 55, 84, 66, 91, 74, 62, 78, 88, 58, 80] as const;

export const DEMO_REPORT_LINES = [
  "EZ-HealthCare Admin Report",
  "Generated: 2025",
  "",
  "Total Visits: 247",
  "Active Clinics: 8",
  "Avg Waiting Time: 3m 9s",
  "DAG Dispatched: 45.7K",
  "Containment Rate: 91% AI Resolved",
] as const;
export const DEMO_REPORT_FILENAME = "ez-healthcare-dashboard-report.txt";
