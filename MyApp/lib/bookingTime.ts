// Shared by the live booking flow (PublicBookingView) and the calendar-builder
// preview, so the preview shows the same slots a real guest would see instead
// of a second, hand-maintained copy of this logic.

// Duration strings are stored as e.g. "15 min", "30 min", "1 hour" — this
// only needs the leading number to lay out the day's slots.
export function parseDurationMinutes(duration: string | undefined): number {
  if (!duration) return 30;
  const match = duration.match(/\d+/);
  const value = match ? parseInt(match[0], 10) : 30;
  return duration.toLowerCase().includes("hour") ? value * 60 : value;
}

export function formatTime(hour: number, minute: number, is24Hour: boolean): string {
  if (is24Hour) {
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

export type AvailabilityRange = { start: number; end: number };
export type WeeklyAvailability = Record<string, AvailabilityRange[]>;

export const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Falls back to Mon-Fri 9-5 for events saved before the Availability editor
// existed (their `availability` column is null) — same hours buildTimeSlots
// used to hardcode, so nothing changes for them until the owner edits it.
export const DEFAULT_AVAILABILITY: WeeklyAvailability = {
  Sunday: [],
  Monday: [{ start: 9 * 60, end: 17 * 60 }],
  Tuesday: [{ start: 9 * 60, end: 17 * 60 }],
  Wednesday: [{ start: 9 * 60, end: 17 * 60 }],
  Thursday: [{ start: 9 * 60, end: 17 * 60 }],
  Friday: [{ start: 9 * 60, end: 17 * 60 }],
  Saturday: [],
};

export function getDayRanges(availability: WeeklyAvailability | null | undefined, date: Date): AvailabilityRange[] {
  const source = availability || DEFAULT_AVAILABILITY;
  return source[WEEK_DAYS[date.getDay()]] ?? [];
}

// Slots are minutes-since-midnight rather than pre-formatted strings, so
// toggling 12h/24h can reformat the label without losing which slot is
// selected (a formatted string would stop matching once the format changes).
// Each configured range for the day is stepped independently, so a split
// day (e.g. a morning block and an evening block) lays out slots in both
// without spilling a step across the gap between them.
export function buildTimeSlots(stepMinutes: number, ranges: AvailabilityRange[] = [{ start: 9 * 60, end: 17 * 60 }]): number[] {
  const slots: number[] = [];
  for (const range of ranges) {
    let totalMinutes = range.start;
    while (totalMinutes + stepMinutes <= range.end) {
      slots.push(totalMinutes);
      totalMinutes += stepMinutes;
    }
  }
  return slots;
}
