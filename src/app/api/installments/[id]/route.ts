import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canManagePayments } from "@/lib/permissions";
import { isProductApproved } from "@/lib/leadService";
import {
  installmentUpdateSchema,
  isManualInstallmentStatus,
} from "@/lib/validations/installment";
import { logAudit, getRequestMeta } from "@/lib/audit";

// Edita monto, fecha o estado de una cuota. Solo cuotas sin cobro de por medio
// (pendientes, suspendidas o anuladas): las pagadas o fallidas las determina el
// procesador de pagos y no se tocan a mano.
export const PATCH = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const existing = await prisma.installment.findUnique({
    where: { id: Number(id) },
    include: {
      paymentPlan: {
        select: {
          productId: true,
          product: {
            select: {
              lead: { select: { id: true, companyId: true, teamId: true, assignedToId: true } },
            },
          },
        },
      },
    },
  });
  if (!existing) return notFound("Cuota no encontrada");

  const lead = existing.paymentPlan.product.lead;
  if (!canAccessLead(session.user, lead)) return forbidden();
  if (!canManagePayments(session.user.role)) return forbidden();

  if (!(await isProductApproved(existing.paymentPlan.productId)))
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

  const installment = await prisma.installment.update({
    where: { id: existing.id },
    data: {
      ...(changes.date ? { date } : {}),
      ...(changes.amount ? { amount } : {}),
      ...(changes.status ? { status } : {}),
    },
  });

  await logAudit({
    action: "INSTALLMENT_UPDATED",
    actor: { id: session.user.id, role: session.user.role, name: session.user.name },
    entityType: "Installment",
    entityId: installment.id,
    metadata: { leadId: lead.id, productId: existing.paymentPlan.productId, changes },
    ...getRequestMeta(req),
  });

  return NextResponse.json(installment);
});
