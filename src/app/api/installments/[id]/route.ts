import { NextResponse } from "next/server";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canManagePayments } from "@/lib/permissions";
import { findInstallmentContext, updateInstallmentIfStatus } from "@/lib/leadService";
import {
  installmentUpdateSchema,
  isManualInstallmentStatus,
} from "@/lib/validations/installment";
import { statusFields } from "@/lib/collections";
import { logAudit, getRequestMeta, auditActor } from "@/lib/audit";

// Edita monto, fecha o estado de una cuota. Solo cuotas sin cobro de por medio
// (pendientes, suspendidas o anuladas): las pagadas o fallidas las determina el
// procesador de pagos y no se tocan a mano.
export const PATCH = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const ctx = await findInstallmentContext(Number(id));
  if (!ctx) return notFound("Cuota no encontrada");
  const { installment: existing, lead, productId } = ctx;

  if (!canAccessLead(session.user, lead)) return forbidden();
  if (!canManagePayments(session.user.role)) return forbidden();

  if (!ctx.productApproved)
    return badRequest("Solo se pueden editar cuotas de un producto aprobado");

  if (!isManualInstallmentStatus(existing.status))
    return badRequest("Esta cuota ya tiene un cobro registrado y no se puede editar");

  const parsed = installmentUpdateSchema.safeParse(await req.json());
  if (!parsed.success)
    return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

  const { date, amount, status } = parsed.data;

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (date && date.getTime() !== existing.date.getTime())
    changes.date = { from: existing.date.toISOString(), to: date.toISOString() };
  if (amount !== undefined && amount !== Number(existing.amount))
    changes.amount = { from: Number(existing.amount), to: amount };
  if (status && status !== existing.status)
    changes.status = { from: existing.status, to: status };

  if (Object.keys(changes).length === 0) return badRequest("No hay cambios para guardar");

  // El motivo de suspensión solo se registra desde la acción "Suspender" de la
  // cola de cobros.
  const installment = await updateInstallmentIfStatus(existing.id, existing.status, {
    ...(changes.date ? { date } : {}),
    ...(changes.amount ? { amount } : {}),
    ...(changes.status && status ? statusFields(status) : {}),
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
