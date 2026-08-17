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

// Slots are minutes-since-midnight rather than pre-formatted strings, so
// toggling 12h/24h can reformat the label without losing which slot is
// selected (a formatted string would stop matching once the format changes).
export function buildTimeSlots(stepMinutes: number): number[] {
  const slots: number[] = [];
  let totalMinutes = 9 * 60; // 9:00 AM
  const endMinutes = 17 * 60; // 5:00 PM
  while (totalMinutes < endMinutes) {
    slots.push(totalMinutes);
    totalMinutes += stepMinutes;
  }
  return slots;
}
