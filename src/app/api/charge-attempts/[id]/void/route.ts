import { NextResponse } from "next/server";
import { withAuthParams, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canManagePayments } from "@/lib/permissions";
import { findAttemptContext, voidAttempt } from "@/lib/payments/charges";
import { logAudit, getRequestMeta, auditActor } from "@/lib/audit";

// Anula un débito que SOAR todavía no transmitió al banco. La cuota vuelve a
// quedar pendiente.
export const POST = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const ctx = await findAttemptContext(Number(id));
  if (!ctx) return notFound("Cobro no encontrado");

  if (!canAccessLead(session.user, ctx.lead)) return forbidden();
  if (!canManagePayments(session.user.role)) return forbidden();

  const attempt = await voidAttempt(ctx.id);

  await logAudit({
    action: "CHARGE_VOIDED",
    actor: auditActor(session.user),
    entityType: "Installment",
    entityId: ctx.installmentId,
    metadata: { leadId: ctx.lead.id, productId: ctx.productId, attemptId: ctx.id },
    ...getRequestMeta(req),
  });

  return NextResponse.json(attempt);
});
