import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canManagePayments } from "@/lib/permissions";
import { findLeadProduct, isProductApproved } from "@/lib/leadService";
import { productStatusSchema } from "@/lib/validations/product";
import { logAudit, getRequestMeta } from "@/lib/audit";

// Estado del producto (activo o suspendido). Antes de la aprobación el estado
// lo maneja el flujo de aprobación (un rechazo lo suspende), por eso aquí solo
// se acepta para productos aprobados.
export const PATCH = withAuthParams<{ id: string; productId: string }>(
  async (req, session, { id, productId }) => {
    const match = await findLeadProduct(Number(id), Number(productId));
    if (!match) return notFound("Producto no encontrado");
    if (!canAccessLead(session.user, match.lead)) return forbidden();
    if (!canManagePayments(session.user.role)) return forbidden();

    if (!(await isProductApproved(match.product.id)))
      return badRequest("Solo se puede cambiar el estado de un producto aprobado");

    const parsed = productStatusSchema.safeParse(await req.json());
    if (!parsed.success)
      return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

    const product = await prisma.product.update({
      where: { id: match.product.id },
      data: { status: parsed.data.status },
      select: { id: true, status: true },
    });

    if (product.status !== match.product.status) {
      await logAudit({
        action: "PRODUCT_UPDATED",
        actor: { id: session.user.id, role: session.user.role, name: session.user.name },
        entityType: "Product",
        entityId: product.id,
        metadata: {
          leadId: match.lead.id,
          changedFields: ["status"],
          from: match.product.status,
          to: product.status,
        },
        ...getRequestMeta(req),
      });
    }

    return NextResponse.json(product);
  },
);
