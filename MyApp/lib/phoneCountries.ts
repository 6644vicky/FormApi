// Dial codes for the booking form's phone field. Deliberately a curated list
// of the countries this app actually sees traffic from rather than all ~250 —
// adding an entry is a one-liner, and the selector searches by name so a long
// list stays usable if it grows.
export type PhoneCountry = {
  /** ISO 3166-1 alpha-2, also used as the React key and lookup id. */
  code: string;
  name: string;
  /** Includes the leading "+", since that's how it's shown and stored. */
  dial: string;
  flag: string;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", dial: "+32", flag: "🇧🇪" },
  { code: "CH", name: "Switzerland", dial: "+41", flag: "🇨🇭" },
  { code: "AT", name: "Austria", dial: "+43", flag: "🇦🇹" },
  { code: "SE", name: "Sweden", dial: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norway", dial: "+47", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", dial: "+45", flag: "🇩🇰" },
  { code: "FI", name: "Finland", dial: "+358", flag: "🇫🇮" },
  { code: "PL", name: "Poland", dial: "+48", flag: "🇵🇱" },
  { code: "CZ", name: "Czechia", dial: "+420", flag: "🇨🇿" },
  { code: "RO", name: "Romania", dial: "+40", flag: "🇷🇴" },
  { code: "GR", name: "Greece", dial: "+30", flag: "🇬🇷" },
  { code: "TR", name: "Türkiye", dial: "+90", flag: "🇹🇷" },
  { code: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
  { code: "IL", name: "Israel", dial: "+972", flag: "🇮🇱" },
  { code: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪" },
  { code: "EG", name: "Egypt", dial: "+20", flag: "🇪🇬" },
  { code: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
  { code: "CL", name: "Chile", dial: "+56", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", dial: "+57", flag: "🇨🇴" },
  { code: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
  { code: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾" },
  { code: "ID", name: "Indonesia", dial: "+62", flag: "🇮🇩" },
  { code: "TH", name: "Thailand", dial: "+66", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", dial: "+84", flag: "🇻🇳" },
  { code: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭" },
  { code: "HK", name: "Hong Kong", dial: "+852", flag: "🇭🇰" },
  { code: "JP", name: "Japan", dial: "+81", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", dial: "+82", flag: "🇰🇷" },
  { code: "CN", name: "China", dial: "+86", flag: "🇨🇳" },
  { code: "TW", name: "Taiwan", dial: "+886", flag: "🇹🇼" },
  { code: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka", dial: "+94", flag: "🇱🇰" },
  { code: "NP", name: "Nepal", dial: "+977", flag: "🇳🇵" },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0];

export function findPhoneCountry(code: string): PhoneCountry {
  return PHONE_COUNTRIES.find((country) => country.code === code) || DEFAULT_PHONE_COUNTRY;
}

// Best guess at the visitor's country from their browser locale (e.g.
// "en-GB" -> GB), so a guest usually doesn't have to touch the selector.
// Falls back to the first entry whenever the region is missing or unlisted.
export function guessPhoneCountryCode(): string {
  try {
    const languages = typeof navigator === "undefined" ? [] : [navigator.language, ...(navigator.languages || [])];
    for (const language of languages) {
      const region = language?.split("-")[1]?.toUpperCase();
      if (region && PHONE_COUNTRIES.some((country) => country.code === region)) return region;
    }
  } catch {
    // Any Intl/navigator oddity just means we use the default.
  }
  return DEFAULT_PHONE_COUNTRY.code;
}
