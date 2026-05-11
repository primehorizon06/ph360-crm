import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest } from "@/lib/api";

export const GET = withAuthParams<{ id: string }>(async (_req, _session, { id }) => {
  const products = await prisma.product.findMany({
    where: { leadId: Number(id) },
    include: {
      paymentMethod: true,
      paymentPlan: {
        include: { installments: { orderBy: { number: "asc" } } },
      },
      approval: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(products);
});

export const POST = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const body = await req.json();
  const { product, paymentMethod } = body;

  if (!product || !paymentMethod?.type)
    return badRequest("Producto y método de pago son requeridos");

  const existingCount = await prisma.product.count({
    where: { leadId: Number(id) },
  });
  const isFirstProduct = existingCount === 0;

  const leadProduct = await prisma.product.create({
    data: {
      leadId: Number(id),
      product,
      paymentMethod: {
        create: {
          type: paymentMethod.type,
          cardType: paymentMethod.cardType ?? null,
          lastFour: paymentMethod.lastFour ?? null,
          holderName: paymentMethod.holderName ?? null,
          bank: paymentMethod.bank ?? null,
          accountNumber: paymentMethod.accountNumber ?? null,
          accountHolder: paymentMethod.accountHolder ?? null,
          accountBank: paymentMethod.accountBank ?? null,
          routingNumber: paymentMethod.routingNumber ?? null,
          accountType: paymentMethod.accountType ?? null,
        },
      },
    },
    include: { paymentMethod: true },
  });

  await prisma.productApproval.create({
    data: {
      productId: leadProduct.id,
      leadId: Number(id),
      isFirstProduct,
      status: "PENDING",
    },
  });

  if (isFirstProduct) {
    await prisma.lead.update({
      where: { id: Number(id) },
      data: {
        conversionStatus: "PENDING",
        conversionRequestedAt: new Date(),
      },
    });
  }

  const lead = await prisma.lead.findUnique({
    where: { id: Number(id) },
    select: { firstName: true, lastName: true, teamId: true },
  });

  if (lead) {
    const coach = await prisma.user.findFirst({
      where: { teamId: lead.teamId, role: "COACH" },
      select: { id: true },
    });

    if (coach) {
      const leadName = `${lead.firstName} ${lead.lastName ?? ""}`.trim();
      await prisma.notification.create({
        data: {
          userId: coach.id,
          type: "PRODUCT_APPROVAL_PENDING",
          title: "Producto pendiente de aprobación",
          body: `${leadName} tiene un nuevo producto que requiere tu revisión.`,
          leadId: Number(id),
          productId: leadProduct.id,
        },
      });
    }
  }

  return NextResponse.json(leadProduct, { status: 201 });
});
