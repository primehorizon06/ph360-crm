import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, forbidden, badRequest, notFound } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { productCatalogSchema } from "@/lib/validations/productCatalog";

export const PATCH = withAuthParams<{ id: string }>(
  async (req, session, { id }) => {
    if (session.user.role !== UserRole.ADMIN) return forbidden();

    const existing = await prisma.productCatalog.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) return notFound("Producto no encontrado");

    const body = await req.json();
    const parsed = productCatalogSchema.safeParse({
      name: existing.name,
      minValue: Number(existing.minValue),
      maxValue: existing.maxValue === null ? null : Number(existing.maxValue),
      active: existing.active,
      color: existing.color,
      ...body,
    });
    if (!parsed.success)
      return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

    const item = await prisma.productCatalog.update({
      where: { id: existing.id },
      data: parsed.data,
    });

    await logAudit({
      action: "PRODUCT_CATALOG_UPDATED",
      actor: { id: session.user.id, role: session.user.role, name: session.user.name },
      entityType: "ProductCatalog",
      entityId: item.id,
      metadata: parsed.data,
      ...getRequestMeta(req),
    });

    return NextResponse.json(item);
  },
);
