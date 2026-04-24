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
        include: {
          installments: { orderBy: { number: "asc" } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
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

  const leadProduct = await prisma.product.create({
    data: {
      leadId: Number(id),
      product,
      paymentMethod: {
        create: {
          type: paymentMethod.type,
          // Tarjeta
          cardType: paymentMethod.cardType ?? null,
          lastFour: paymentMethod.lastFour ?? null,
          holderName: paymentMethod.holderName ?? null,
          bank: paymentMethod.bank ?? null,
          // Cuenta
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

  return NextResponse.json(leadProduct, { status: 201 });
}
