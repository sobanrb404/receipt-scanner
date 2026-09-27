// Quick period presets for the dashboard's date filter — each returns a
// {from, to} pair in "YYYY-MM-DD" (what the backend's date_from/date_to
// query params expect), computed from "today".

// Formats using the date's LOCAL year/month/day — not toISOString(), which
// converts to UTC first and can silently roll a local midnight back to the
// previous day for any timezone ahead of UTC (e.g. "Sep 1 00:00 PKT"
// becomes "2026-08-31" in UTC). Every date here represents a calendar day
// the user picked, so it must stay in the user's own calendar.
function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(d: Date): Date {
  // Monday as the first day of the week.
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday;
}

export type PeriodKey = "this_week" | "this_month" | "this_year" | "last_month" | "all_time";

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "all_time", label: "All time" },
  { key: "this_week", label: "This week" },
  { key: "this_month", label: "This month" },
  { key: "this_year", label: "This year" },
  { key: "last_month", label: "Last month" },
];

export function getPeriodRange(period: PeriodKey): { from?: string; to?: string } {
  const now = new Date();

  switch (period) {
    case "this_week": {
      const from = startOfWeek(now);
      return { from: toISODate(from), to: toISODate(now) };
    }
    case "this_month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toISODate(from), to: toISODate(now) };
    }
    case "this_year": {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from: toISODate(from), to: toISODate(now) };
    }
    case "last_month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0); // last day of previous month
      return { from: toISODate(from), to: toISODate(to) };
    }
    case "all_time":
    default:
      return {};
  }
}
