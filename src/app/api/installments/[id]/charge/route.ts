import { NextResponse } from "next/server";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canManagePayments } from "@/lib/permissions";
import { findInstallmentContext } from "@/lib/leadService";
import { chargeSchema } from "@/lib/validations/installment";
import { chargeInstallment } from "@/lib/payments/charges";
import { logAudit, getRequestMeta, auditActor } from "@/lib/audit";

// Crea el débito ACH (SEC TEL) de la cuota en SOAR, después de que el cliente
// lo autorizó por teléfono. La grabación de la llamada se guarda fuera del CRM.
export const POST = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const ctx = await findInstallmentContext(Number(id));
  if (!ctx) return notFound("Cuota no encontrada");

  if (!canAccessLead(session.user, ctx.lead)) return forbidden();
  if (!canManagePayments(session.user.role)) return forbidden();

  const parsed = chargeSchema.safeParse(await req.json());
  if (!parsed.success)
    return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

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
    },
    ...getRequestMeta(req),
  });

  return NextResponse.json(attempt, { status: 201 });
});
