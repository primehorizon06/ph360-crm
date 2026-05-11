import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest } from "@/lib/api";

export const PUT = withAuthParams<{ id: string; productId: string }>(
  async (req, _session, { productId }) => {
    const { installments } = await req.json();

    if (!Array.isArray(installments) || installments.length === 0)
      return badRequest("Se requiere al menos una cuota");

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
  },
);

export const GET = withAuthParams<{ id: string; productId: string }>(
  async (_req, _session, { productId }) => {
    const plan = await prisma.paymentPlan.findUnique({
      where: { productId: Number(productId) },
      include: { installments: { orderBy: { number: "asc" } } },
    });

    return NextResponse.json(plan ?? null);
  },
);
