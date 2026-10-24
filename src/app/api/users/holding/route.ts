import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, forbidden } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { canCreateProduct } from "@/lib/permissions";

export const GET = withAuth(async (_req, session) => {
  if (!canCreateProduct(session.user.role)) return forbidden();

  const users = await prisma.user.findMany({
    where: { role: UserRole.CUSTOMER_SERVICE_HOLDING, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
});
