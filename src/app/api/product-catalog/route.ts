import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, forbidden, badRequest } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { productCatalogSchema } from "@/lib/validations/productCatalog";

export const GET = withAuth(async (_req, session) => {
  const isAdmin = session.user.role === UserRole.ADMIN;

  const catalog = await prisma.productCatalog.findMany({
    where: isAdmin ? undefined : { active: true },
    include: isAdmin ? { _count: { select: { products: true } } } : undefined,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(catalog);
});

export const POST = withAuth(async (req, session) => {
  if (session.user.role !== UserRole.ADMIN) return forbidden();

  const parsed = productCatalogSchema.safeParse(await req.json());
  if (!parsed.success)
    return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

  const item = await prisma.productCatalog.create({ data: parsed.data });

  await logAudit({
    action: "PRODUCT_CATALOG_CREATED",
    actor: { id: session.user.id, role: session.user.role, name: session.user.name },
    entityType: "ProductCatalog",
    entityId: item.id,
    metadata: parsed.data,
    ...getRequestMeta(req),
  });

  return NextResponse.json(item, { status: 201 });
});
