import type { InstallmentStatus, Prisma } from "@prisma/client";

// Reglas de la cola de cobros, compartidas por las rutas y la interfaz.

export const COLLECTION_VIEWS = ["today", "overdue", "suspended", "processing", "failed"] as const;
export type CollectionView = (typeof COLLECTION_VIEWS)[number];

export function isCollectionView(value: string | null): value is CollectionView {
  return !!value && (COLLECTION_VIEWS as readonly string[]).includes(value);
}

// ─── Fechas ───────────────────────────────────────────────────────────────────
//
// "Hoy" se calcula en la zona horaria del negocio (el CRM se usa solo en
// Colombia), igual en el servidor (que puede estar en UTC) y en el navegador.
// Sin esto, desde las 7 p. m. un servidor en UTC ya estaría en el día siguiente.

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
  const parts = Object.fromEntries(
    zonedFormat.formatToParts(date).map((p) => [p.type, Number(p.value)]),
  );
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
}

/** Diferencia (ms) entre la hora de la zona del negocio y UTC en ese instante. */
function zoneOffset(date: Date): number {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Instante de la medianoche, en la zona del negocio, del día indicado. */
function zonedMidnight(year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month - 1, day);
  // Dos pasadas para acertar el desfase en los días de cambio de horario.
  const first = guess - zoneOffset(new Date(guess));
  return new Date(guess - zoneOffset(new Date(first)));
}

export function startOfToday(): Date {
  const { year, month, day } = zonedParts(new Date());
  return zonedMidnight(year, month, day);
}

export function startOfTomorrow(): Date {
  const { year, month, day } = zonedParts(new Date());
  return zonedMidnight(year, month, day + 1);
}

/** Fecha de hoy en la zona del negocio, como valor de un <input type="date">. */
export function todayInputValue(): string {
  const { year, month, day } = zonedParts(new Date());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

// ─── Transiciones de estado de una cuota ──────────────────────────────────────

/** Cobrar: pendiente (y que ya venza; ver chargeInstallment). */
export function canCharge(status: string): boolean {
  return status === "PENDING";
}

/** Suspender: pendiente, cuando el cliente no contesta o no autoriza. */
export function canSuspend(status: string): boolean {
  return status === "PENDING";
}

/** Reprogramar: pendiente, suspendida o devuelta. */
export function canReschedule(status: string): boolean {
  return status === "PENDING" || status === "SUSPENDED" || status === "FAILED";
}

/**
 * Campos que acompañan un cambio de estado: la suspensión guarda fecha y
 * motivo, y cualquier otro estado los limpia.
 */
export function statusFields(status: InstallmentStatus, suspendReason?: string | null) {
  const suspended = status === "SUSPENDED";
  return {
    status,
    suspendedAt: suspended ? new Date() : null,
    suspendReason: suspended ? (suspendReason ?? null) : null,
  };
}

// ─── Filtros de la cola ───────────────────────────────────────────────────────

// Cada pestaña de la cola: cuotas pendientes de hoy, pendientes vencidas,
// suspendidas (el cliente no autorizó y hay que volver a llamar), con débito en
// curso y devueltas (hay que reprogramar o cobrar con tarjeta).
export function viewFilter(view: CollectionView): Prisma.InstallmentWhereInput {
  switch (view) {
    case "today":
      return { status: "PENDING", date: { gte: startOfToday(), lt: startOfTomorrow() } };
    case "overdue":
      return { status: "PENDING", date: { lt: startOfToday() } };
    case "suspended":
      return { status: "SUSPENDED" };
    case "processing":
      return { status: "PROCESSING" };
    case "failed":
      return { status: "FAILED" };
  }
}

export const VIEW_ORDER: Record<CollectionView, Prisma.InstallmentOrderByWithRelationInput[]> = {
  today: [{ id: "asc" }],
  overdue: [{ date: "asc" }, { id: "asc" }],
  suspended: [{ suspendedAt: "asc" }, { id: "asc" }],
  processing: [{ date: "asc" }, { id: "asc" }],
  failed: [{ date: "asc" }, { id: "asc" }],
};

// Una cuota es cobrable si su producto está aprobado y activo: un producto
// rechazado o suspendido no se cobra.
export function isCollectableProduct(product: {
  status: string;
  approval: { status: string } | null;
}): boolean {
  return product.status === "ACTIVE" && product.approval?.status === "APPROVED";
}

export function collectableProductFilter(
  leadFilter: Prisma.LeadWhereInput,
): Prisma.InstallmentWhereInput {
  return {
    paymentPlan: {
      product: {
        status: "ACTIVE",
        approval: { status: "APPROVED" },
        lead: leadFilter,
      },
    },
  };
}
