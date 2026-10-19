import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead, isCustomerService } from "@/lib/permissions";
import { findLeadProduct, parseInstallments } from "@/lib/leadService";
import { checkPlanTotal } from "@/lib/validations/productCatalog";
import { isWeekendDate, WEEKEND_DATE_ERROR } from "@/lib/businessDays";

export const PUT = withAuthParams<{ id: string; productId: string }>(
  async (req, session, { id, productId }) => {
    const match = await findLeadProduct(Number(id), Number(productId));
    if (!match) return notFound("Producto no encontrado");
    if (!canAccessLead(session.user, match.lead)) return forbidden();
    if (isCustomerService(session.user.role)) return forbidden();

    // Reemplazar el plan completo borra las cuotas y su historial; con el
    // producto aprobado, las cuotas se editan una por una (/api/installments).
    const approval = await prisma.productApproval.findUnique({
      where: { productId: Number(productId) },
      select: { status: true },
    });
    if (approval?.status === "APPROVED")
      return forbidden("El plan de un producto aprobado se edita cuota por cuota");

    const installments = parseInstallments((await req.json()).installments);
    if (!installments) return badRequest("Se requiere al menos una cuota válida");
    const existingDates = new Set(
      (
        await prisma.installment.findMany({
          where: { paymentPlan: { productId: Number(productId) } },
          select: { date: true },
        })
      ).map((i) => i.date.getTime()),
    );
    if (installments.some((i) => !existingDates.has(i.date.getTime()) && isWeekendDate(i.date)))
      return badRequest(WEEKEND_DATE_ERROR);

    const planError = checkPlanTotal(
      installments.reduce((acc, i) => acc + i.amount, 0),
      match.product.catalog,
    );
    if (planError) return badRequest(planError);

    const plan = await prisma.paymentPlan.upsert({
      where: { productId: Number(productId) },
      create: {
        productId: Number(productId),
        installments: {
          create: installments,
        },
      },
      update: {
        installments: {
          deleteMany: {},
          create: installments,
        },
      },
      include: { installments: { orderBy: { number: "asc" } } },
    });

    return NextResponse.json(plan);
  },
);

export const GET = withAuthParams<{ id: string; productId: string }>(
  async (_req, session, { id, productId }) => {
    const match = await findLeadProduct(Number(id), Number(productId));
    if (!match) return notFound("Producto no encontrado");
    if (!canAccessLead(session.user, match.lead)) return forbidden();

    const plan = await prisma.paymentPlan.findUnique({
      where: { productId: Number(productId) },
      include: { installments: { orderBy: { number: "asc" } } },
    });

    return NextResponse.json(plan ?? null);
  },
);
