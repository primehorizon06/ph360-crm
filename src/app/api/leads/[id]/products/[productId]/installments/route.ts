import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canManagePayments } from "@/lib/permissions";
import { findLeadProduct, isProductApproved } from "@/lib/leadService";
import { installmentCreateSchema } from "@/lib/validations/installment";
import { logAudit, getRequestMeta } from "@/lib/audit";

// Agrega una cuota al plan de un producto aprobado. Se numera al final del plan.
export const POST = withAuthParams<{ id: string; productId: string }>(
  async (req, session, { id, productId }) => {
    const match = await findLeadProduct(Number(id), Number(productId));
    if (!match) return notFound("Producto no encontrado");
    if (!canAccessLead(session.user, match.lead)) return forbidden();
    if (!canManagePayments(session.user.role)) return forbidden();

    if (!(await isProductApproved(match.product.id)))
      return badRequest("Solo se pueden agregar cuotas a un producto aprobado");

    const parsed = installmentCreateSchema.safeParse(await req.json());
    if (!parsed.success)
      return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

    const plan = await prisma.paymentPlan.upsert({
      where: { productId: match.product.id },
      create: { productId: match.product.id },
      update: {},
      select: { id: true },
    });

    const last = await prisma.installment.aggregate({
      where: { paymentPlanId: plan.id },
      _max: { number: true },
    });

    const installment = await prisma.installment.create({
      data: {
        paymentPlanId: plan.id,
        number: (last._max.number ?? 0) + 1,
        date: parsed.data.date,
        amount: parsed.data.amount,
      },
    });

    await logAudit({
      action: "INSTALLMENT_CREATED",
      actor: { id: session.user.id, role: session.user.role, name: session.user.name },
      entityType: "Installment",
      entityId: installment.id,
      metadata: {
        leadId: match.lead.id,
        productId: match.product.id,
        number: installment.number,
        amount: parsed.data.amount,
        date: parsed.data.date.toISOString(),
      },
      ...getRequestMeta(req),
    });

    return NextResponse.json(installment, { status: 201 });
  },
);
