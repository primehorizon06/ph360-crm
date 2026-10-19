// Calendario del negocio, compartido por el servidor y el navegador.
//
// - Las fechas de calendario se manejan como "YYYY-MM-DD" en la zona horaria
//   del negocio (el CRM se usa solo en Colombia). Así un servidor en UTC no
//   cambia de día a las 7 p. m.
// - Un día hábil es de lunes a viernes, sin los festivos de la Reserva Federal
//   de EE. UU., que son los días en que ACH no procesa débitos.

export const BUSINESS_TIMEZONE = "America/Bogota";

const zonedFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function zonedParts(date: Date) {
  const p = Object.fromEntries(
    zonedFormat.formatToParts(date).map((part) => [part.type, Number(part.value)]),
  );
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second };
}

/** Diferencia (ms) entre la hora de la zona del negocio y UTC en ese instante. */
function zoneOffset(date: Date): number {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// ─── Fechas de calendario (YYYY-MM-DD) ────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

function toYmd(year: number, month: number, day: number): string {
  // Date.UTC normaliza desbordes (p. ej. día 32 → mes siguiente).
  const d = new Date(Date.UTC(year, month - 1, day));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function parseYmd(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return { year, month, day };
}

export function isYmd(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month, day } = parseYmd(value);
  return toYmd(year, month, day) === value;
}

/** Fecha de calendario (en la zona del negocio) de un instante. */
export function ymdOf(date: Date): string {
  const { year, month, day } = zonedParts(date);
  return toYmd(year, month, day);
}

export function todayYmd(): string {
  return ymdOf(new Date());
}

export function addDays(ymd: string, days: number): string {
  const { year, month, day } = parseYmd(ymd);
  return toYmd(year, month, day + days);
}

/** Instante de la medianoche (en la zona del negocio) de una fecha. */
export function startOfDay(ymd: string): Date {
  const { year, month, day } = parseYmd(ymd);
  const guess = Date.UTC(year, month - 1, day);
  // Dos pasadas para acertar el desfase en los días de cambio de horario.
  const first = guess - zoneOffset(new Date(guess));
  return new Date(guess - zoneOffset(new Date(first)));
}

export function startOfToday(): Date {
  return startOfDay(todayYmd());
}

export function startOfTomorrow(): Date {
  return startOfDay(addDays(todayYmd(), 1));
}

/** 0 = domingo … 6 = sábado. */
function weekday(ymd: string): number {
  const { year, month, day } = parseYmd(ymd);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isWeekend(ymd: string): boolean {
  const d = weekday(ymd);
  return d === 0 || d === 6;
}

/** Las cuotas nunca se programan en sábado o domingo. */
export const WEEKEND_DATE_ERROR = "Las cuotas no pueden caer en sábado ni domingo";

export function isWeekendDate(date: Date): boolean {
  return isWeekend(ymdOf(date));
}

/** Rango de una quincena (1: días 1–15, 2: del 16 a fin de mes) en días de Colombia. */
export function quincenaRange(year: number, month: number, quincena: 1 | 2) {
  const first = toYmd(year, month, 1);
  const sixteenth = toYmd(year, month, 16);
  const nextMonth = toYmd(year, month + 1, 1);
  return quincena === 1
    ? { gte: startOfDay(first), lt: startOfDay(sixteenth) }
    : { gte: startOfDay(sixteenth), lt: startOfDay(nextMonth) };
}

// ─── Festivos ACH (Reserva Federal) ───────────────────────────────────────────

/** El n-ésimo `dow` (0 = domingo) del mes; n = -1 es el último. */
function nthWeekday(year: number, month: number, dow: number, n: number): string {
  if (n > 0) {
    const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    return toYmd(year, month, 1 + ((dow - firstDow + 7) % 7) + (n - 1) * 7);
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDow = new Date(Date.UTC(year, month - 1, lastDay)).getUTCDay();
  return toYmd(year, month, lastDay - ((lastDow - dow + 7) % 7));
}

// Un festivo fijo que cae en domingo se observa el lunes. Si cae en sábado, la
// Reserva Federal no lo traslada al viernes (ese viernes es hábil).
function observed(year: number, month: number, day: number): string {
  const ymd = toYmd(year, month, day);
  return weekday(ymd) === 0 ? addDays(ymd, 1) : ymd;
}

const holidayCache = new Map<number, Set<string>>();

function federalHolidays(year: number): Set<string> {
  let holidays = holidayCache.get(year);
  if (!holidays) {
    holidays = new Set([
      observed(year, 1, 1), // Año Nuevo
      nthWeekday(year, 1, 1, 3), // Martin Luther King Jr.
      nthWeekday(year, 2, 1, 3), // Presidents Day
      nthWeekday(year, 5, 1, -1), // Memorial Day
      observed(year, 6, 19), // Juneteenth
      observed(year, 7, 4), // Independencia
      nthWeekday(year, 9, 1, 1), // Labor Day
      nthWeekday(year, 10, 1, 2), // Columbus Day
      observed(year, 11, 11), // Veterans Day
      nthWeekday(year, 11, 4, 4), // Thanksgiving
      observed(year, 12, 25), // Navidad
    ]);
    holidayCache.set(year, holidays);
  }
  return holidays;
}

export function isAchHoliday(ymd: string): boolean {
  return federalHolidays(parseYmd(ymd).year).has(ymd);
}

export function isBusinessDay(ymd: string): boolean {
  return !isWeekend(ymd) && !isAchHoliday(ymd);
}

/** La fecha si es hábil; si no, el siguiente día hábil (cuando ACH la procesa). */
export function nextBusinessDay(ymd: string): string {
  let d = ymd;
  while (!isBusinessDay(d)) d = addDays(d, 1);
  return d;
}

/** `count` días hábiles a partir de `from` (incluido si es hábil). */
export function businessDaysFrom(from: string, count: number): string[] {
  const days: string[] = [];
  let d = nextBusinessDay(from);
  while (days.length < count) {
    days.push(d);
    d = nextBusinessDay(addDays(d, 1));
  }
  return days;
}
