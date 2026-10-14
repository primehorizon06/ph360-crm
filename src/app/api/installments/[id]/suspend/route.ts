import { NextResponse } from "next/server";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canManagePayments } from "@/lib/permissions";
import { findInstallmentContext, updateInstallmentIfStatus } from "@/lib/leadService";
import { suspendSchema } from "@/lib/validations/installment";
import { canSuspend, statusFields } from "@/lib/collections";
import { logAudit, getRequestMeta, auditActor } from "@/lib/audit";

// Suspende una cuota pendiente cuando el cliente no contesta o no autoriza el
// cobro. Queda en la pestaña "Suspendidas" hasta que se reprograme.
export const POST = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const ctx = await findInstallmentContext(Number(id));
  if (!ctx) return notFound("Cuota no encontrada");
  const { installment: existing, lead, productId } = ctx;

  if (!canAccessLead(session.user, lead)) return forbidden();
  if (!canManagePayments(session.user.role)) return forbidden();

  if (!ctx.productCollectable)
    return badRequest("Solo se gestionan cuotas de productos aprobados y activos");
  if (!canSuspend(existing.status))
    return badRequest("Solo se puede suspender una cuota pendiente");

  const parsed = suspendSchema.safeParse(await req.json());
  if (!parsed.success)
    return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

  const installment = await updateInstallmentIfStatus(
    existing.id,
    existing.status,
    statusFields("SUSPENDED", parsed.data.reason),
  );

  await logAudit({
    action: "INSTALLMENT_SUSPENDED",
    actor: auditActor(session.user),
    entityType: "Installment",
    entityId: installment.id,
    metadata: { leadId: lead.id, productId, reason: parsed.data.reason },
    ...getRequestMeta(req),
  });

  return NextResponse.json(installment);
});
