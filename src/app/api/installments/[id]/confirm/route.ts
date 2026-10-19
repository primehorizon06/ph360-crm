import { NextResponse } from "next/server";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canConfirmInstallment } from "@/lib/permissions";
import { findInstallmentContext, updateInstallmentIfStatus } from "@/lib/leadService";
import { confirmSchema } from "@/lib/validations/installment";
import { canToggleConfirmation, CLEAR_CONFIRMATION } from "@/lib/collections";
import { logAudit, getRequestMeta, auditActor } from "@/lib/audit";

// Confirma un pago pendiente o le quita la confirmación: el cliente autorizó el
// débito de esa fecha y ese monto. Solo los pagos confirmados aparecen en Cobros.
export const POST = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const ctx = await findInstallmentContext(Number(id));
  if (!ctx) return notFound("Pago no encontrado");
  const { installment: existing, lead, productId } = ctx;

  if (!canAccessLead(session.user, lead)) return forbidden();
  if (!canConfirmInstallment(session.user.role)) return forbidden();

  if (!ctx.productCollectable)
    return badRequest("Solo se confirman pagos de productos aprobados y activos");
  if (!canToggleConfirmation(existing.status))
    return badRequest("Solo se puede confirmar un pago pendiente");

  const parsed = confirmSchema.safeParse(await req.json());
  if (!parsed.success)
    return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const { confirmed } = parsed.data;

  if (confirmed === !!existing.confirmedAt)
    return badRequest(confirmed ? "El pago ya está confirmado" : "El pago no está confirmado");

  const installment = await updateInstallmentIfStatus(
    existing.id,
    existing.status,
    confirmed
      ? { confirmedAt: new Date(), confirmedById: Number(session.user.id) }
      : CLEAR_CONFIRMATION,
  );

  await logAudit({
    action: confirmed ? "INSTALLMENT_CONFIRMED" : "INSTALLMENT_UNCONFIRMED",
    actor: auditActor(session.user),
    entityType: "Installment",
    entityId: installment.id,
    metadata: {
      leadId: lead.id,
      productId,
      date: installment.date.toISOString(),
      amount: Number(installment.amount),
    },
    ...getRequestMeta(req),
  });

  return NextResponse.json(installment);
});
