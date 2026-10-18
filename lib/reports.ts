import { DEMO_REPORT_LINES, DEMO_REPORT_FILENAME } from "@/lib/constants/dashboard";

export function downloadDemoReport() {
  const report = DEMO_REPORT_LINES.join("\n");
  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = DEMO_REPORT_FILENAME;
  link.click();
  URL.revokeObjectURL(url);
}
