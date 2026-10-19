import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { UserFacingError } from "@/lib/errors";
import { canAccessLead, canManagePayments } from "@/lib/permissions";
import { findInstallmentContext } from "@/lib/leadService";
import { cancelSchema } from "@/lib/validations/installment";
import { CANCELLABLE_STATUSES, canCancel, statusFields } from "@/lib/collections";
import { voidAttempt } from "@/lib/payments/charges";
import { isUnconfirmedAttempt } from "@/lib/payments/status";
import { logAudit, getRequestMeta, auditActor } from "@/lib/audit";

// Da de baja un pago para siempre (acuerdo con el cliente, pago duplicado). Si
// tiene un débito en proceso, primero se anula en SOAR; si SOAR ya lo transmitió
// al banco, no se puede cancelar.
export const POST = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const ctx = await findInstallmentContext(Number(id));
  if (!ctx) return notFound("Pago no encontrado");
  const { installment: existing, lead, productId } = ctx;

  if (!canAccessLead(session.user, lead)) return forbidden();
  if (!canManagePayments(session.user.role)) return forbidden();

  if (!ctx.productCollectable)
    return badRequest("Solo se gestionan pagos de productos aprobados y activos");
  if (!canCancel(existing.status))
    return badRequest("Este pago ya no se puede cancelar");

  const parsed = cancelSchema.safeParse(await req.json());
  if (!parsed.success)
    return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const { reason } = parsed.data;

  let voidedAttemptId: number | undefined;

  if (existing.status === "PROCESSING") {
    const attempt = await prisma.chargeAttempt.findFirst({
      where: { installmentId: existing.id },
      orderBy: { id: "desc" },
    });
    if (!attempt)
      return badRequest("Este pago figura en proceso pero no tiene un cobro registrado; revísalo antes de cancelarlo");
    if (attempt.processor !== "SOAR_ACH")
      return badRequest("Este pago se está cobrando con tarjeta y no se puede anular desde el CRM");
    // Un débito sin confirmar puede existir en SOAR: hay que verificarlo, no descartarlo.
    if (isUnconfirmedAttempt(attempt))
      return badRequest(
        "SOAR no confirmó el débito de este pago. Verifícalo en Cobros (pestaña Proceso) antes de cancelarlo",
      );

    // voidAttempt valida que SOAR todavía no lo haya transmitido al banco.
    await voidAttempt(attempt.id);
    voidedAttemptId = attempt.id;

    await logAudit({
      action: "CHARGE_VOIDED",
      actor: auditActor(session.user),
      entityType: "Installment",
      entityId: existing.id,
      metadata: { leadId: lead.id, productId, attemptId: attempt.id, trigger: "cancel" },
      ...getRequestMeta(req),
    });
  }

  // Se cancela desde cualquier estado cancelable: si el pago cambió entre anular
  // y cancelar (un webhook, otro usuario), igual se da de baja mientras no se
  // haya cobrado.
  const { count } = await prisma.installment.updateMany({
    where: { id: existing.id, status: { in: CANCELLABLE_STATUSES } },
    data: statusFields("CANCELLED", reason),
  });
  if (count === 0)
    throw new UserFacingError(
      voidedAttemptId
        ? "El débito se anuló en SOAR, pero el pago cambió mientras tanto; recarga para ver su estado"
        : "El pago cambió mientras tanto; recarga e inténtalo de nuevo",
      409,
    );
  const installment = await prisma.installment.findUniqueOrThrow({ where: { id: existing.id } });

  await logAudit({
    action: "INSTALLMENT_CANCELLED",
    actor: auditActor(session.user),
    entityType: "Installment",
    entityId: installment.id,
    metadata: {
      leadId: lead.id,
      productId,
      reason,
      fromStatus: existing.status,
      ...(voidedAttemptId ? { voidedAttemptId } : {}),
    },
    ...getRequestMeta(req),
  });

  return NextResponse.json(installment);
});
