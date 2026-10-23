import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, forbidden, notFound } from "@/lib/api";
import { canAccessLead } from "@/lib/permissions";
import { findLeadProduct } from "@/lib/leadService";
import { decrypt } from "@/lib/crypto";
import { logAudit, auditActor, getRequestMeta } from "@/lib/audit";

export const POST = withAuthParams<{ id: string; productId: string }>(
  async (req, session, { id, productId }) => {
    const match = await findLeadProduct(Number(id), Number(productId));
    if (!match) return notFound("Producto no encontrado");
    if (!canAccessLead(session.user, match.lead)) return forbidden();

    const method = await prisma.paymentMethod.findUnique({
      where: { productId: match.product.id },
      select: { type: true, accountNumber: true, routingNumber: true },
    });
    if (method?.type !== "CUENTA") return notFound("El producto no tiene una cuenta bancaria");

    await logAudit({
      action: "BANK_ACCOUNT_REVEALED",
      actor: auditActor(session.user),
      entityType: "Product",
      entityId: match.product.id,
      metadata: { leadId: match.lead.id },
      ...getRequestMeta(req),
    });

    return NextResponse.json(
      {
        accountNumber: decrypt(method.accountNumber),
        routingNumber: decrypt(method.routingNumber),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  },
);
