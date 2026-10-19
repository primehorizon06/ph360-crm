import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canManagePayments } from "@/lib/permissions";
import { findLeadProduct, isProductApproved } from "@/lib/leadService";
import { productStatusSchema } from "@/lib/validations/product";
import { PRODUCT_SUSPENDED_REASON, statusFields } from "@/lib/collections";
import { logAudit, getRequestMeta, auditActor } from "@/lib/audit";

// Estado del producto (activo o suspendido). Antes de la aprobación el estado
// lo maneja el flujo de aprobación (un rechazo lo suspende), por eso aquí solo
// se acepta para productos aprobados.
//
// Suspender el producto suspende todos sus pagos pendientes (y pierden la
// confirmación). Los débitos ya enviados a SOAR no se tocan: se informa cuántos
// hay para anularlos desde Cobros. Reactivar el producto devuelve a pendiente
// solo los pagos que se suspendieron por el producto.
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

    const { status } = parsed.data;
    if (status === match.product.status)
      return badRequest(status === "SUSPENDED" ? "El producto ya está suspendido" : "El producto ya está activo");

    const productInstallments = { paymentPlan: { productId: match.product.id } };
    const suspending = status === "SUSPENDED";

    const [product, affected, processing] = await prisma.$transaction([
      prisma.product.update({
        where: { id: match.product.id },
        data: { status },
        select: { id: true, status: true },
      }),
      suspending
        ? prisma.installment.updateMany({
            where: { ...productInstallments, status: "PENDING" },
            data: statusFields("SUSPENDED", PRODUCT_SUSPENDED_REASON),
          })
        : prisma.installment.updateMany({
            where: {
              ...productInstallments,
              status: "SUSPENDED",
              suspendReason: PRODUCT_SUSPENDED_REASON,
            },
            data: statusFields("PENDING"),
          }),
      prisma.installment.count({ where: { ...productInstallments, status: "PROCESSING" } }),
    ]);

    await logAudit({
      action: "PRODUCT_UPDATED",
      actor: auditActor(session.user),
      entityType: "Product",
      entityId: product.id,
      metadata: {
        leadId: match.lead.id,
        changedFields: ["status"],
        from: match.product.status,
        to: product.status,
        [suspending ? "installmentsSuspended" : "installmentsReactivated"]: affected.count,
        installmentsProcessing: processing,
      },
      ...getRequestMeta(req),
    });

    return NextResponse.json({
      ...product,
      /** Pagos suspendidos (o reactivados) junto con el producto. */
      installmentsAffected: affected.count,
      /** Débitos ya enviados a SOAR que siguen su curso. */
      installmentsProcessing: processing,
    });
  },
);
