import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, forbidden, badRequest, notFound } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";

export const PATCH = withAuthParams<{ id: string; productId: string }>(
  async (req, session, { id, productId }) => {
    const { action, note } = await req.json();

    if (!action || !["APPROVE", "REJECT", "RESUBMIT"].includes(action))
      return badRequest("Acción inválida");

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

      const lead = await prisma.lead.findUnique({
        where: { id: Number(id) },
        select: { firstName: true, lastName: true, teamId: true },
      });

      if (lead) {
        const coach = await prisma.user.findFirst({
          where: { teamId: lead.teamId, role: UserRole.COACH },
          select: { id: true },
        });

        if (coach) {
          const leadName = `${lead.firstName} ${lead.lastName ?? ""}`.trim();
          await prisma.notification.create({
            data: {
              userId: coach.id,
              type: "PRODUCT_APPROVAL_PENDING",
              title: "Producto reenviado para aprobación",
              body: `${leadName} ha corregido y reenviado un producto para tu revisión.`,
              leadId: Number(id),
              productId: Number(productId),
            },
          });
        }
      }

      return NextResponse.json({ ok: true });
    }

    // ── APPROVE / REJECT — solo coach, supervisor o admin ────────────────────
    if (
      ![UserRole.COACH, UserRole.SUPERVISOR, UserRole.ADMIN].includes(
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

    if (action === "APPROVE" && approval.isFirstProduct) {
      await prisma.lead.update({
        where: { id: Number(id) },
        data: {
          type: "customer",
          conversionStatus: "APPROVED",
          convertedAt: new Date(),
        },
      });
    }

    if (action === "REJECT" && approval.isFirstProduct) {
      await prisma.lead.update({
        where: { id: Number(id) },
        data: {
          conversionStatus: "REJECTED",
          conversionNote: note,
        },
      });
    }

    if (action === "REJECT") {
      await prisma.product.update({
        where: { id: Number(productId) },
        data: { status: "SUSPENDED" },
      });
    }

    return NextResponse.json(updated);
  },
);
