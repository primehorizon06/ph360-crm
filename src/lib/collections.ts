import type { InstallmentStatus, Prisma } from "@prisma/client";
import {
  addDays,
  businessDaysFrom,
  nextBusinessDay,
  startOfDay,
  todayYmd,
  ymdOf,
} from "@/lib/businessDays";

// Reglas de la cola de cobros, compartidas por las rutas y la interfaz.
//
// Pestañas:
//   transfer   — confirmadas que aún no se envían a SOAR (por fecha de la ventana)
//   approved   — pagadas (por fecha de pago)
//   processing — débito enviado o programado
//   fallen     — caídas: suspendidas y devueltas

export const COLLECTION_VIEWS = ["transfer", "approved", "processing", "fallen"] as const;
export type CollectionView = (typeof COLLECTION_VIEWS)[number];

export function isCollectionView(value: string | null): value is CollectionView {
  return !!value && (COLLECTION_VIEWS as readonly string[]).includes(value);
}

// ─── Ventana de cobro ─────────────────────────────────────────────────────────
//
// Transfer muestra hoy (aunque no sea hábil) y las 4 fechas hábiles
// siguientes. Es también el límite para programar un débito por adelantado.

export const COLLECTION_WINDOW_DAYS = 5;

/** Fechas de la ventana (YYYY-MM-DD): hoy y las 4 fechas hábiles siguientes. */
export function collectionWindow(): string[] {
  const today = todayYmd();
  return [today, ...businessDaysFrom(addDays(today, 1), COLLECTION_WINDOW_DAYS - 1)];
}

/** Instante en que termina la ventana (medianoche después de su último día). */
export function collectionWindowEnd(window = collectionWindow()): Date {
  return startOfDay(addDays(window[window.length - 1], 1));
}

/**
 * Fecha de la ventana en la que aparece una cuota: la primera que no es
 * anterior a su fecha. Las atrasadas aparecen hoy (se cobran con fecha de hoy)
 * y una cuota en festivo aparece el siguiente día hábil.
 */
export function windowDayFor(window: string[], installmentYmd: string): string | undefined {
  return window.find((day) => installmentYmd <= day);
}

/** Rango de fechas de cuota que cubre un día de la ventana (ver windowDayFor). */
export function windowDayRange(window: string[], ymd: string): Prisma.DateTimeFilter | null {
  const i = window.indexOf(ymd);
  if (i < 0) return null;
  const lt = startOfDay(addDays(ymd, 1));
  return i === 0 ? { lt } : { gte: startOfDay(addDays(window[i - 1], 1)), lt };
}

/**
 * Día hábil en que ACH procesaría el débito de una cuota: su fecha (o el
 * siguiente hábil si cae en festivo), y si ya venció, el próximo día hábil
 * desde hoy.
 */
export function chargeDateFor(installmentDate: Date | string): string {
  const due = ymdOf(new Date(installmentDate));
  const today = todayYmd();
  return nextBusinessDay(due > today ? due : today);
}

// ─── Transiciones de estado de una cuota ──────────────────────────────────────

/** Confirmar o quitar la confirmación: solo antes de enviarla a SOAR. */
export function canToggleConfirmation(status: string): boolean {
  return status === "PENDING";
}

/** Cobrar o programar: pendiente, confirmada y dentro de la ventana. */
export function canCharge(installment: { status: string; confirmedAt: Date | string | null }): boolean {
  return installment.status === "PENDING" && !!installment.confirmedAt;
}

/** Suspender: pendiente, cuando el cliente no contesta o no autoriza. */
export function canSuspend(status: string): boolean {
  return status === "PENDING";
}

/** Reprogramar: pendiente, suspendida o devuelta. */
const RESCHEDULABLE_STATUSES: InstallmentStatus[] = ["PENDING", "SUSPENDED", "FAILED"];

export function canReschedule(status: string): boolean {
  return (RESCHEDULABLE_STATUSES as string[]).includes(status);
}

/**
 * Cancelar (baja definitiva): cualquier pago que no se haya cobrado. Si está
 * en proceso, primero se anula el débito en SOAR.
 */
export const CANCELLABLE_STATUSES: InstallmentStatus[] = [...RESCHEDULABLE_STATUSES, "PROCESSING"];

export function canCancel(status: string): boolean {
  return (CANCELLABLE_STATUSES as string[]).includes(status);
}

/**
 * Motivo con que se suspenden los pagos al suspender su producto. Al reactivar
 * el producto, solo vuelven a pendiente los pagos con este motivo.
 */
export const PRODUCT_SUSPENDED_REASON = "Producto suspendido";

/** Campos que limpian la confirmación de una cuota. */
export const CLEAR_CONFIRMATION = { confirmedAt: null, confirmedById: null } as const;

/**
 * Campos que acompañan un cambio de estado. La suspensión y la cancelación
 * guardan fecha y motivo, y cualquier otro estado los limpia. Volver a
 * pendiente, suspender, devolver o cancelar también reinicia la confirmación:
 * la autorización era para ese cobro, y hay que confirmarla de nuevo.
 */
export function statusFields(status: InstallmentStatus, reason?: string | null) {
  const suspended = status === "SUSPENDED";
  const cancelled = status === "CANCELLED";
  const resetsConfirmation =
    status === "PENDING" || suspended || status === "FAILED" || cancelled;
  return {
    status,
    suspendedAt: suspended ? new Date() : null,
    suspendReason: suspended ? (reason ?? null) : null,
    cancelledAt: cancelled ? new Date() : null,
    cancelReason: cancelled ? (reason ?? null) : null,
    ...(resetsConfirmation ? CLEAR_CONFIRMATION : {}),
  };
}

// ─── Filtros de la cola ───────────────────────────────────────────────────────

/**
 * Filtro de cada pestaña. Transfer y Aprobados reciben la fecha elegida: un día
 * de la ventana (fecha de la cuota) o un día cualquiera (fecha de pago).
 */
export function viewFilter(
  view: CollectionView,
  ymd: string,
  window: string[] = collectionWindow(),
): Prisma.InstallmentWhereInput | null {
  switch (view) {
    case "transfer": {
      const date = windowDayRange(window, ymd);
      return date && { status: "PENDING", confirmedAt: { not: null }, date };
    }
    case "approved":
      return { status: "PAID", paidAt: { gte: startOfDay(ymd), lt: startOfDay(addDays(ymd, 1)) } };
    case "processing":
      return { status: "PROCESSING" };
    case "fallen":
      return { status: { in: ["SUSPENDED", "FAILED"] } };
  }
}

export const VIEW_ORDER: Record<CollectionView, Prisma.InstallmentOrderByWithRelationInput[]> = {
  transfer: [{ date: "asc" }, { id: "asc" }],
  approved: [{ paidAt: "desc" }, { id: "asc" }],
  processing: [{ date: "asc" }, { id: "asc" }],
  fallen: [{ date: "asc" }, { id: "asc" }],
};

// Una cuota es cobrable si su producto está aprobado y activo: un producto
// rechazado o suspendido no se cobra.
export function isCollectableProduct(product: {
  status: string;
  approval: { status: string } | null;
}): boolean {
  return product.status === "ACTIVE" && product.approval?.status === "APPROVED";
}

/**
 * Pagos de productos aprobados. Con `activeOnly` (Transfer: lo que se cobra)
 * solo de productos activos; sin él también de productos suspendidos, cuyos
 * pagos quedan en Caída y cuyos débitos ya enviados siguen en Proceso.
 */
export function collectableProductFilter(
  leadFilter: Prisma.LeadWhereInput,
  { activeOnly = true, catalogId }: { activeOnly?: boolean; catalogId?: number } = {},
): Prisma.InstallmentWhereInput {
  return {
    paymentPlan: {
      product: {
        ...(activeOnly ? { status: "ACTIVE" as const } : {}),
        ...(catalogId ? { catalogId } : {}),
        approval: { status: "APPROVED" },
        lead: leadFilter,
      },
    },
  };
}
