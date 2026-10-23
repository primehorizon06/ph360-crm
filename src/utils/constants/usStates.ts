export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "NC", name: "Carolina del Norte" },
  { code: "SC", name: "Carolina del Sur" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "ND", name: "Dakota del Norte" },
  { code: "SD", name: "Dakota del Sur" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "Distrito de Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawái" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Luisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Míchigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Misisipi" },
  { code: "MO", name: "Misuri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NJ", name: "Nueva Jersey" },
  { code: "NY", name: "Nueva York" },
  { code: "NH", name: "Nuevo Hampshire" },
  { code: "NM", name: "Nuevo México" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregón" },
  { code: "PA", name: "Pensilvania" },
  { code: "PR", name: "Puerto Rico" },
  { code: "RI", name: "Rhode Island" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WV", name: "Virginia Occidental" },
  { code: "WA", name: "Washington" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
] as const;

export type UsStateCode = (typeof US_STATES)[number]["code"];

export const US_STATE_CODES = US_STATES.map((s) => s.code) as [UsStateCode, ...UsStateCode[]];

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export function toKnownStateCode(value: string | null | undefined): UsStateCode | "" {
  if (!value) return "";
  const upper = value.trim().toUpperCase();
  const byCode = US_STATES.find((s) => s.code === upper);
  if (byCode) return byCode.code;
  const byName = US_STATES.find((s) => normalize(s.name) === normalize(value));
  return byName ? byName.code : "";
}

export function stateLabel(code: string | null | undefined): string | null {
  const match = code ? US_STATES.find((s) => s.code === code) : undefined;
  return match ? `${match.name} (${match.code})` : null;
}
