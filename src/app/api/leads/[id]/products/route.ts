import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead } from "@/lib/permissions";
import { encryptRandom, decrypt } from "@/lib/crypto";
import { productSchema } from "@/lib/validations/product";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { notifyLeadReviewers } from "@/lib/approvalService";

export const GET = withAuthParams<{ id: string }>(
  async (_req, session, { id }) => {
    const lead = await prisma.lead.findUnique({ where: { id: Number(id) } });
    if (!lead) return notFound("Lead no encontrado");
    if (!canAccessLead(session.user, lead)) return forbidden();

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

    const decrypted = products.map((p) =>
      p.paymentMethod
        ? {
            ...p,
            paymentMethod: {
              ...p.paymentMethod,
              accountNumber: decrypt(p.paymentMethod.accountNumber),
              routingNumber: decrypt(p.paymentMethod.routingNumber),
            },
          }
        : p,
    );

    return NextResponse.json(decrypted);
  },
);

export const POST = withAuthParams<{ id: string }>(
  async (req, session, { id }) => {
    const leadId = Number(id);
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return notFound("Lead no encontrado");
    if (!canAccessLead(session.user, lead)) return forbidden();

    const body = await req.json();
    const { product, paymentMethod } = body;

    if (!product || !paymentMethod?.type)
      return badRequest("Producto y método de pago son requeridos");

    // productSchema espera un objeto plano (paymentType + campos), no el
    // { product, paymentMethod: { type, ... } } que envía el cliente.
    const parsed = productSchema.safeParse({
      product,
      paymentType: paymentMethod.type,
      ...paymentMethod,
    });
    if (!parsed.success)
      return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

    const existingCount = await prisma.product.count({
      where: { leadId },
    });
    const isFirstProduct = existingCount === 0;

    const leadProduct = await prisma.product.create({
      data: {
        leadId,
        product,
        paymentMethod: {
          create: {
            type: paymentMethod.type,
            cardType: paymentMethod.cardType ?? null,
            lastFour: paymentMethod.lastFour ?? null,
            holderName: paymentMethod.holderName ?? null,
            bank: paymentMethod.bank ?? null,
            accountNumber: encryptRandom(paymentMethod.accountNumber ?? null),
            accountHolder: paymentMethod.accountHolder ?? null,
            accountBank: paymentMethod.accountBank ?? null,
            routingNumber: encryptRandom(paymentMethod.routingNumber ?? null),
            accountType: paymentMethod.accountType ?? null,
          },
        },
      },
      include: { paymentMethod: true },
    });

    await prisma.productApproval.create({
      data: {
        productId: leadProduct.id,
        leadId,
        isFirstProduct,
        status: "PENDING",
      },
    });

    if (isFirstProduct) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          conversionStatus: "PENDING",
          conversionRequestedAt: new Date(),
        },
      });
    }

    const leadName = `${lead.firstName} ${lead.lastName ?? ""}`.trim();
    await notifyLeadReviewers({
      leadId,
      productId: leadProduct.id,
      title: "Producto pendiente de aprobación",
      body: `${leadName} tiene un nuevo producto que requiere tu revisión.`,
    });

    await logAudit({
      action: "PRODUCT_CREATED",
      actor: { id: session.user.id, role: session.user.role, name: session.user.name },
      entityType: "Product",
      entityId: leadProduct.id,
      metadata: { leadId, product, paymentType: paymentMethod.type },
      ...getRequestMeta(req),
    });

    return NextResponse.json(
      {
        ...leadProduct,
        paymentMethod: leadProduct.paymentMethod
          ? {
              ...leadProduct.paymentMethod,
              accountNumber: paymentMethod.accountNumber ?? null,
              routingNumber: paymentMethod.routingNumber ?? null,
            }
          : leadProduct.paymentMethod,
      },
      { status: 201 },
    );
  },
);
