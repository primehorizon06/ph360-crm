import type { ChargeAttemptStatus, InstallmentStatus } from "@prisma/client";

// Traduce el estado de cada procesador al estado del intento y de la cuota.

export function mapSoarStatus(
  status: string,
): { attempt: ChargeAttemptStatus; installment: InstallmentStatus } | null {
  switch (status) {
    case "Pending":
    case "Submitted":
    case "Held":
    case "Transmitted":
      return { attempt: "PROCESSING", installment: "PROCESSING" };
    case "Settled":
      return { attempt: "SUCCEEDED", installment: "PAID" };
    case "Returned":
    case "Error":
      return { attempt: "FAILED", installment: "FAILED" };
    case "Voided":
      // Anular un débito no perdona la cuota: vuelve a quedar por cobrar.
      return { attempt: "VOIDED", installment: "PENDING" };
    default:
      return null;
  }
}

// SOAR solo permite anular un débito antes de transmitirlo al banco.
const SOAR_VOIDABLE_STATUSES = ["Pending", "Submitted", "Held"];

export function isVoidableAttempt(attempt: { status: string; rawStatus: string | null }): boolean {
  return attempt.status === "PROCESSING" && SOAR_VOIDABLE_STATUSES.includes(attempt.rawStatus ?? "");
}

// Débito que SOAR no confirmó (timeout o error ambiguo al crearlo): puede o no
// existir. Customer Service lo verifica en SOAR buscando su memo.
export const UNCONFIRMED_STATUS = "Unknown";

export function isUnconfirmedAttempt(attempt: { status: string; rawStatus: string | null }): boolean {
  return attempt.status === "PROCESSING" && attempt.rawStatus === UNCONFIRMED_STATUS;
}

/** Memo del débito en SOAR; permite encontrarlo si su respuesta se perdió. */
export function chargeMemo(installmentId: number, attemptId: number): string {
  return `PH360-CUOTA-${installmentId}-INTENTO-${attemptId}`;
}

// Códigos de devolución ACH (NACHA) más comunes.
export const ACH_RETURN_REASONS: Record<string, string> = {
  R01: "Fondos insuficientes",
  R02: "Cuenta cerrada",
  R03: "La cuenta no existe o no coincide con el titular",
  R04: "Número de cuenta inválido",
  R05: "Débito no autorizado a cuenta de consumidor",
  R07: "El cliente revocó la autorización",
  R08: "El cliente detuvo el pago",
  R09: "Fondos no disponibles",
  R10: "El cliente indica que no autorizó el débito",
  R11: "El débito no coincide con lo autorizado",
  R16: "Cuenta congelada",
  R20: "La cuenta no admite débitos",
  R29: "Débito no autorizado por la empresa titular",
};

export function achReturnReason(code: string | null | undefined): string | null {
  if (!code) return null;
  return ACH_RETURN_REASONS[code] ?? `Devolución ${code}`;
}
