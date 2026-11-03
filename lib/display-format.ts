export const DISPLAY_TIME_ZONE = "Asia/Ho_Chi_Minh";
const missing = "—";

function validDate(value?: string | Date | null) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Calendar dates such as DOB must not move to the previous day in another timezone. */
export function formatDate(value?: string | Date | null) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = validDate(value + "T00:00:00Z");
    if (!date || date.toISOString().slice(0, 10) !== value) return missing;
    return value.split("-").reverse().join("/");
  }
  const date = validDate(value);
  return date
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: DISPLAY_TIME_ZONE,
      }).format(date)
    : missing;
}

export function formatTime(value?: string | Date | null) {
  const date = validDate(value);
  return date
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: DISPLAY_TIME_ZONE,
      }).format(date)
    : missing;
}

export function formatDateTime(value?: string | Date | null) {
  const date = validDate(value);
  return date ? `${formatTime(date)} · ${formatDate(date)}` : missing;
}

export function businessDateInput(value: Date = new Date()) {
  return formatDate(value).split("/").reverse().join("-");
}

/** Only shorten technical UUIDs; human-facing patient/ticket numbers stay intact. */
export function shortIdentifier(value?: string | null) {
  if (!value) return missing;
  return /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
    ? `${value.slice(0, 8)}…${value.slice(-4)}`
    : value;
}

export function shiftLabel(value: string) {
  return ({ MORNING: "Ca sáng", AFTERNOON: "Ca chiều" } as Record<string, string>)[value] || value;
}
