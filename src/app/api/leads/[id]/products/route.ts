import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

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
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { product, paymentMethod } = body;

  if (!product || !paymentMethod?.type)
    return NextResponse.json(
      { error: "Producto y método de pago son requeridos" },
      { status: 400 },
    );

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

  // Si es el primer producto → activar conversión pendiente en el lead
  if (isFirstProduct) {
    await prisma.lead.update({
      where: { id: Number(id) },
      data: {
        conversionStatus: "PENDING",
        conversionRequestedAt: new Date(),
      },
    });
  }

  return NextResponse.json(leadProduct, { status: 201 });
}
