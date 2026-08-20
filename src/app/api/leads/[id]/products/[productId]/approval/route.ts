import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, forbidden, badRequest, notFound } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { canAccessLead } from "@/lib/permissions";
import { findLeadProduct } from "@/lib/leadService";
import { applyApprovalDecision, notifyReviewersOfResubmit } from "@/lib/approvalService";
import { logAudit, getRequestMeta } from "@/lib/audit";

export const PATCH = withAuthParams<{ id: string; productId: string }>(
  async (req, session, { id, productId }) => {
    const { action, note } = await req.json();

    if (!action || !["APPROVE", "REJECT", "RESUBMIT"].includes(action))
      return badRequest("Acción inválida");

    const match = await findLeadProduct(Number(id), Number(productId));
    if (!match) return notFound("Producto no encontrado");
    if (!canAccessLead(session.user, match.lead)) return forbidden();

    // ── RESUBMIT — solo agente o admin ───────────────────────────────────────
    if (action === "RESUBMIT") {
      if (
        session.user.role !== UserRole.AGENT &&
        session.user.role !== UserRole.ADMIN
      )
        return forbidden();

      await prisma.productApproval.update({
        where: { productId: Number(productId) },
        data: { status: "PENDING", note: null },
      });

      await prisma.product.update({
        where: { id: Number(productId) },
        data: { status: "ACTIVE" },
      });

      await notifyReviewersOfResubmit(Number(id), Number(productId));

      return NextResponse.json({ ok: true });
    }

    // ── APPROVE / REJECT — solo coach, supervisor o admin ────────────────────
    if (
      !([UserRole.COACH, UserRole.SUPERVISOR, UserRole.ADMIN] as UserRole[]).includes(
        session.user.role,
      )
    )
      return forbidden();

    if (action === "REJECT" && !note?.trim())
      return badRequest("El motivo de rechazo es requerido");

    const approval = await prisma.productApproval.findUnique({
      where: { productId: Number(productId) },
    });

    if (!approval) return notFound("Aprobación no encontrada");

    const updated = await prisma.productApproval.update({
      where: { productId: Number(productId) },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        note: action === "REJECT" ? note : null,
      },
    });

    await applyApprovalDecision({
      leadId: Number(id),
      productId: Number(productId),
      action,
      isFirstProduct: approval.isFirstProduct,
      note,
    });

    await logAudit({
      action: action === "APPROVE" ? "PRODUCT_APPROVED" : "PRODUCT_REJECTED",
      actor: { id: session.user.id, role: session.user.role, name: session.user.name },
      entityType: "Product",
      entityId: Number(productId),
      metadata: { leadId: Number(id), note: action === "REJECT" ? note : undefined },
      ...getRequestMeta(req),
    });

    return NextResponse.json(updated);
  },
);
