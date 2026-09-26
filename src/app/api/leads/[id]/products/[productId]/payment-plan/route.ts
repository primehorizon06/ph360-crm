import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead } from "@/lib/permissions";
import { findLeadProduct, parseInstallments } from "@/lib/leadService";
import { checkPlanTotal } from "@/lib/validations/productCatalog";

export const PUT = withAuthParams<{ id: string; productId: string }>(
  async (req, session, { id, productId }) => {
    const match = await findLeadProduct(Number(id), Number(productId));
    if (!match) return notFound("Producto no encontrado");
    if (!canAccessLead(session.user, match.lead)) return forbidden();

    const installments = parseInstallments((await req.json()).installments);
    if (!installments) return badRequest("Se requiere al menos una cuota válida");

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
