import { NextResponse } from "next/server";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canManagePayments } from "@/lib/permissions";
import { findLeadProduct, isProductApproved } from "@/lib/leadService";
import { ensureSoarAccount } from "@/lib/payments/charges";
import { logAudit, getRequestMeta, auditActor } from "@/lib/audit";

// Reintenta crear el cliente y la cuenta en SOAR cuando falló al aprobar el
// producto (o después de cambiar la cuenta bancaria).
export const POST = withAuthParams<{ id: string; productId: string }>(
  async (req, session, { id, productId }) => {
    const match = await findLeadProduct(Number(id), Number(productId));
    if (!match) return notFound("Producto no encontrado");
    if (!canAccessLead(session.user, match.lead)) return forbidden();
    if (!canManagePayments(session.user.role)) return forbidden();

    if (!(await isProductApproved(match.product.id)))
      return badRequest("El producto todavía no está aprobado");

    const ids = await ensureSoarAccount(match.product.id);

    await logAudit({
      action: "SOAR_CUSTOMER_SYNCED",
      actor: auditActor(session.user),
      entityType: "Product",
      entityId: match.product.id,
      metadata: { leadId: match.lead.id, trigger: "manual" },
      ...getRequestMeta(req),
    });

    return NextResponse.json(ids);
  },
);
