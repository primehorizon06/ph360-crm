import { NextResponse } from "next/server";
import { withAuthParams, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canManagePayments } from "@/lib/permissions";
import { findInstallmentContext } from "@/lib/leadService";
import { chargeInstallment } from "@/lib/payments/charges";
import { logAudit, getRequestMeta, auditActor } from "@/lib/audit";

// Crea el débito ACH (SEC TEL) de una cuota confirmada en SOAR. La
// confirmación de la cuota registra la autorización del cliente; la grabación
// de la llamada se guarda fuera del CRM.
export const POST = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const ctx = await findInstallmentContext(Number(id));
  if (!ctx) return notFound("Cuota no encontrada");

  if (!canAccessLead(session.user, ctx.lead)) return forbidden();
  if (!canManagePayments(session.user.role)) return forbidden();

  const attempt = await chargeInstallment(ctx.installment.id, Number(session.user.id));

  await logAudit({
    action: "CHARGE_CREATED",
    actor: auditActor(session.user),
    entityType: "Installment",
    entityId: ctx.installment.id,
    metadata: {
      leadId: ctx.lead.id,
      productId: ctx.productId,
      attemptId: attempt.id,
      processor: attempt.processor,
      externalId: attempt.externalId,
      amount: Number(attempt.amount),
      secCode: "TEL",
      scheduledFor: attempt.scheduledFor?.toISOString(),
      confirmedAt: ctx.installment.confirmedAt?.toISOString(),
      confirmedById: ctx.installment.confirmedById,
    },
    ...getRequestMeta(req),
  });

  return NextResponse.json(attempt, { status: 201 });
});
