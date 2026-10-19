import { NextResponse } from "next/server";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canManagePayments } from "@/lib/permissions";
import { findInstallmentContext, updateInstallmentIfStatus } from "@/lib/leadService";
import {
  installmentUpdateSchema,
  isEditableInstallmentStatus,
} from "@/lib/validations/installment";
import { CLEAR_CONFIRMATION } from "@/lib/collections";
import { isWeekendDate, WEEKEND_DATE_ERROR } from "@/lib/businessDays";
import { logAudit, getRequestMeta, auditActor } from "@/lib/audit";

// Edita la fecha o el monto de un pago pendiente o suspendido. El estado no se
// cambia a mano: lo determinan las acciones (suspender, reprogramar, cobrar) y
// lo que informa SOAR.
export const PATCH = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const ctx = await findInstallmentContext(Number(id));
  if (!ctx) return notFound("Pago no encontrado");
  const { installment: existing, lead, productId } = ctx;

  if (!canAccessLead(session.user, lead)) return forbidden();
  if (!canManagePayments(session.user.role)) return forbidden();

  if (!ctx.productApproved)
    return badRequest("Solo se pueden editar pagos de un producto aprobado");

  if (!isEditableInstallmentStatus(existing.status))
    return badRequest("Este pago ya tiene un cobro registrado y no se puede editar");

  const parsed = installmentUpdateSchema.safeParse(await req.json());
  if (!parsed.success)
    return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

  const { date, amount } = parsed.data;

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (date && date.getTime() !== existing.date.getTime())
    changes.date = { from: existing.date.toISOString(), to: date.toISOString() };
  if (amount !== undefined && amount !== Number(existing.amount))
    changes.amount = { from: Number(existing.amount), to: amount };

  if (Object.keys(changes).length === 0) return badRequest("No hay cambios para guardar");
  // Solo la fecha nueva se valida: puede haber pagos antiguos en sábado, de
  // cuando el calendario solo bloqueaba los domingos.
  if (changes.date && date && isWeekendDate(date)) return badRequest(WEEKEND_DATE_ERROR);

  // Una confirmación es para esa fecha y ese monto: si cambian, se reinicia.
  const installment = await updateInstallmentIfStatus(existing.id, existing.status, {
    ...(changes.date ? { date } : {}),
    ...(changes.amount ? { amount } : {}),
    ...CLEAR_CONFIRMATION,
  });

  await logAudit({
    action: "INSTALLMENT_UPDATED",
    actor: auditActor(session.user),
    entityType: "Installment",
    entityId: installment.id,
    metadata: { leadId: lead.id, productId, changes },
    ...getRequestMeta(req),
  });

  return NextResponse.json(installment);
});
