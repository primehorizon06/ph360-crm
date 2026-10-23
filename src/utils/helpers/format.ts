import { Installment } from "../interfaces/paymentPlanPicker";

export function formatFullName(person: { firstName: string; lastName?: string | null }): string {
  return `${person.firstName} ${person.lastName ?? ""}`.trim();
}

/** Fecha de calendario "YYYY-MM-DD", p. ej. "lunes 19 de octubre" o "lun 19 oct". */
export function formatYmd(ymd: string, style: "long" | "short" = "long"): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("es-CO", {
      timeZone: "UTC",
      weekday: style,
      day: "numeric",
      month: style,
    })
      .formatToParts(new Date(Date.UTC(year, month - 1, day)))
      .map((p) => [p.type, p.value.replace(/\./g, "")]),
  );
  return style === "long"
    ? `${parts.weekday} ${parts.day} de ${parts.month}`
    : `${parts.weekday} ${parts.day} ${parts.month}`;
}

export function formatDate(iso: string | Date): string {
  const date = new Date(iso);
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleDateString("es-CO", { month: "long" });
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatTotalAmount(installments: Installment[]): string {
  const total = installments.reduce((acc, i) => {
    const val = parseFloat(i.amount.replace(",", "."));
    return acc + (isNaN(val) ? 0 : val);
  }, 0);
  return total.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDuplicateOwner(info?: { franquicia: string } | null): string {
  if (!info) return "";
  return `Franquicia: ${info.franquicia}`;
}

export function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export function formatSsn(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length > 5)
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return digits;
}

export function maskSsn(value: string | null | undefined): string | null {
  if (!value) return null;
  return `***-**-${value.replace(/\D/g, "").slice(-4)}`;
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length > 6)
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length > 3) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length > 0) return `(${digits}`;
  return "";
}

export function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(n)
    .replace(/\s/g, "");
}
