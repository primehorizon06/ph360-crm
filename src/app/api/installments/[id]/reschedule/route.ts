import { NextResponse } from "next/server";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canManagePayments } from "@/lib/permissions";
import { findInstallmentContext, updateInstallmentIfStatus } from "@/lib/leadService";
import { rescheduleSchema } from "@/lib/validations/installment";
import { canReschedule, statusFields } from "@/lib/collections";
import { isWeekendDate, startOfToday, WEEKEND_DATE_ERROR } from "@/lib/businessDays";
import { logAudit, getRequestMeta, auditActor } from "@/lib/audit";

// Mueve una cuota pendiente, suspendida o devuelta a una nueva fecha (hoy o
// después). La cuota vuelve a quedar pendiente; el débito devuelto queda en el
// historial de intentos.
export const POST = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const ctx = await findInstallmentContext(Number(id));
  if (!ctx) return notFound("Cuota no encontrada");
  const { installment: existing, lead, productId } = ctx;

  if (!canAccessLead(session.user, lead)) return forbidden();
  if (!canManagePayments(session.user.role)) return forbidden();

  if (!ctx.productCollectable)
    return badRequest("Solo se gestionan cuotas de productos aprobados y activos");
  if (!canReschedule(existing.status))
    return badRequest("Solo se puede reprogramar una cuota pendiente, suspendida o devuelta");

  const parsed = rescheduleSchema.safeParse(await req.json());
  if (!parsed.success)
    return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

  const { date } = parsed.data;
  if (date < startOfToday()) return badRequest("La nueva fecha no puede ser anterior a hoy");
  if (isWeekendDate(date)) return badRequest(WEEKEND_DATE_ERROR);

  const installment = await updateInstallmentIfStatus(existing.id, existing.status, {
    date,
    ...statusFields("PENDING"),
  });

  await logAudit({
    action: "INSTALLMENT_RESCHEDULED",
    actor: auditActor(session.user),
    entityType: "Installment",
    entityId: installment.id,
    metadata: {
      leadId: lead.id,
      productId,
      fromDate: existing.date.toISOString(),
      toDate: date.toISOString(),
      fromStatus: existing.status,
      suspendReason: existing.suspendReason ?? undefined,
    },
    ...getRequestMeta(req),
  });

  return NextResponse.json(installment);
});
