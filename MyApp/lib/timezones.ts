// The full IANA zone list where the engine exposes it, with a short curated
// fallback for older browsers. Shared by the availability picker and the
// personal timezone setting.
export function listTimeZones(): string[] {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    if (supported) return supported("timeZone");
  } catch {
    // Older engine — fall through to the short list.
  }
  const fallback = [
    "UTC", "America/Los_Angeles", "America/New_York", "America/Chicago", "America/Sao_Paulo",
    "Europe/London", "Europe/Berlin", "Europe/Paris", "Africa/Lagos", "Asia/Dubai",
    "Asia/Calcutta", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
  ];
  return fallback.includes(detected) ? fallback : [detected, ...fallback];
}

export function detectTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
