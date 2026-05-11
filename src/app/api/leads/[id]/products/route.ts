import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, forbidden, badRequest } from "@/lib/api";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session) return forbidden();

  const { id } = await params;

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
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session) return forbidden();

  const { id } = await params;
  const body = await req.json();
  const { product, paymentMethod } = body;

  if (!product || !paymentMethod?.type)
    return badRequest("Producto y método de pago son requeridos");

  // Verificar si es el primer producto
  const existingCount = await prisma.product.count({
    where: { leadId: Number(id) },
  });
  const isFirstProduct = existingCount === 0;

  // Crear el producto con su método de pago
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

  // Crear la aprobación pendiente
  await prisma.productApproval.create({
    data: {
      productId: leadProduct.id,
      leadId: Number(id),
      isFirstProduct,
      status: "PENDING",
    },
  });

  // Si es el primer producto → activar conversión pendiente
  if (isFirstProduct) {
    await prisma.lead.update({
      where: { id: Number(id) },
      data: {
        conversionStatus: "PENDING",
        conversionRequestedAt: new Date(),
      },
    });
  }

  // Buscar el coach del equipo del agente asignado al lead
  const lead = await prisma.lead.findUnique({
    where: { id: Number(id) },
    select: {
      firstName: true,
      lastName: true,
      teamId: true,
    },
  });

  if (lead) {
    const coach = await prisma.user.findFirst({
      where: {
        teamId: lead.teamId,
        role: "COACH",
      },
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
}
