import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/leads/[id]/products/[productId]/payment-plan
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { productId } = await params;
  const { installments } = await req.json();

  if (!Array.isArray(installments) || installments.length === 0)
    return NextResponse.json(
      { error: "Se requiere al menos una cuota" },
      { status: 400 },
    );

  // Upsert PaymentPlan y reemplazar todas las cuotas
  const plan = await prisma.paymentPlan.upsert({
    where: { productId: Number(productId) },
    create: {
      productId: Number(productId),
      installments: {
        create: installments.map(
          (i: { number: number; date: string; amount: string }) => ({
            number: i.number,
            date: new Date(i.date),
            amount: parseFloat(i.amount),
          }),
        ),
      },
    },
    update: {
      // Borrar las existentes y recrear
      installments: {
        deleteMany: {},
        create: installments.map(
          (i: { number: number; date: string; amount: string }) => ({
            number: i.number,
            date: new Date(i.date),
            amount: parseFloat(i.amount),
          }),
        ),
      },
    },
    include: { installments: { orderBy: { number: "asc" } } },
  });

  return NextResponse.json(plan);
}

// GET /api/leads/[id]/products/[productId]/payment-plan
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { productId } = await params;

  const plan = await prisma.paymentPlan.findUnique({
    where: { productId: Number(productId) },
    include: { installments: { orderBy: { number: "asc" } } },
  });

  return NextResponse.json(plan ?? null);
}
