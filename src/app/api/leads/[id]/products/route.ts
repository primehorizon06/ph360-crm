import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead, canCreateProduct } from "@/lib/permissions";
import { encryptRandom } from "@/lib/crypto";
import { productSchema } from "@/lib/validations/product";
import { catalogPrice, checkPlanPrice } from "@/lib/validations/productCatalog";
import { UserRole } from "@/utils/constants/roles";
import { maskPaymentMethod, parseInstallments } from "@/lib/leadService";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { isWeekendDate, WEEKEND_DATE_ERROR } from "@/lib/businessDays";
import { notifyLeadReviewers, notifySpecialPriceAuthorizer } from "@/lib/approvalService";

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
          include: {
            installments: {
              orderBy: { number: "asc" },
              include: {
                confirmedBy: { select: { name: true } },
                attempts: {
                  orderBy: { id: "desc" },
                  select: {
                    id: true,
                    processor: true,
                    externalId: true,
                    status: true,
                    failureCode: true,
                    failureReason: true,
                    cardLast4: true,
                    createdAt: true,
                    chargedBy: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        approval: true,
        catalog: { select: { id: true, name: true, color: true } },
        priceAuthorizedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const masked = products.map((p) =>
      p.paymentMethod ? { ...p, paymentMethod: maskPaymentMethod(p.paymentMethod) } : p,
    );

    return NextResponse.json(masked);
  },
);

export const POST = withAuthParams<{ id: string }>(
  async (req, session, { id }) => {
    const leadId = Number(id);
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return notFound("Lead no encontrado");
    if (!canAccessLead(session.user, lead)) return forbidden();
    if (!canCreateProduct(session.user.role)) return forbidden();

    const body = await req.json();
    const { catalogId, paymentMethod } = body;

    if (!catalogId || !paymentMethod?.type)
      return badRequest("Producto y método de pago son requeridos");

    // productSchema espera un objeto plano (paymentType + campos), no el
    // { catalogId, paymentMethod: { type, ... } } que envía el cliente.
    const parsed = productSchema.safeParse({
      catalogId: String(catalogId),
      paymentType: paymentMethod.type,
      ...paymentMethod,
      priceType: body.priceType ?? "LIST",
      priceAuthorizedById:
        body.priceAuthorizedById == null ? undefined : String(body.priceAuthorizedById),
    });
    if (!parsed.success)
      return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");
    const { priceType } = parsed.data;
    const isSpecialPrice = priceType === "SPECIAL";

    const catalog = await prisma.productCatalog.findUnique({
      where: { id: Number(catalogId) },
    });
    if (!catalog || !catalog.active)
      return badRequest("El producto no existe o está inactivo");

    const price = catalogPrice(catalog, priceType);
    if (price === null) return badRequest("Este producto no tiene precio especial");

    const authorizer = isSpecialPrice
      ? await prisma.user.findFirst({
          where: {
            id: Number(parsed.data.priceAuthorizedById),
            role: UserRole.CUSTOMER_SERVICE_HOLDING,
            active: true,
          },
          select: { id: true, name: true },
        })
      : null;
    if (isSpecialPrice && !authorizer)
      return badRequest("Selecciona un autorizador de CS Holding válido");

    const installments = parseInstallments(body.installments);
    if (!installments) return badRequest("Se requiere al menos una cuota válida");
    if (installments.some((i) => isWeekendDate(i.date))) return badRequest(WEEKEND_DATE_ERROR);

    const planError = checkPlanPrice(
      installments.reduce((acc, i) => acc + i.amount, 0),
      price,
    );
    if (planError) return badRequest(planError);

    const existingCount = await prisma.product.count({
      where: { leadId },
    });
    const isFirstProduct = existingCount === 0;

    const leadProduct = await prisma.product.create({
      data: {
        leadId,
        catalogId: catalog.id,
        price,
        isSpecialPrice,
        priceAuthorizedById: authorizer?.id ?? null,
        paymentPlan: { create: { installments: { create: installments } } },
        paymentMethod: {
          create: {
            type: paymentMethod.type,
            cardType: paymentMethod.cardType ?? null,
            // En cuentas se guardan los últimos 4 dígitos para mostrarlos sin descifrar.
            lastFour:
              paymentMethod.type === "CUENTA"
                ? (paymentMethod.accountNumber?.slice(-4) ?? null)
                : (paymentMethod.lastFour ?? null),
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
      include: {
        paymentMethod: true,
        paymentPlan: {
          include: { installments: { orderBy: { number: "asc" } } },
        },
        catalog: { select: { id: true, name: true, color: true } },
        priceAuthorizedBy: { select: { id: true, name: true } },
      },
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
      metadata: {
        leadId,
        catalogId: catalog.id,
        product: catalog.name,
        paymentType: paymentMethod.type,
        price,
        priceType,
        authorizerId: authorizer?.id,
      },
      ...getRequestMeta(req),
    });

    if (authorizer) {
      await notifySpecialPriceAuthorizer({
        authorizerId: authorizer.id,
        leadId,
        productId: leadProduct.id,
        leadName,
        agentName: session.user.name ?? "Un asesor",
        price,
      });
      await logAudit({
        action: "SPECIAL_PRICE_AUTHORIZED",
        actor: { id: session.user.id, role: session.user.role, name: session.user.name },
        entityType: "Product",
        entityId: leadProduct.id,
        metadata: { leadId, price, authorizerId: authorizer.id, authorizerName: authorizer.name },
        ...getRequestMeta(req),
      });
    }

    return NextResponse.json(
      {
        ...leadProduct,
        paymentMethod: leadProduct.paymentMethod
          ? maskPaymentMethod(leadProduct.paymentMethod)
          : leadProduct.paymentMethod,
      },
      { status: 201 },
    );
  },
);
