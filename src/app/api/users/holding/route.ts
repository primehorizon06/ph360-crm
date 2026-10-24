import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";

export const GET = withAuth(async () => {
  const users = await prisma.user.findMany({
    where: { role: UserRole.CUSTOMER_SERVICE_HOLDING, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
});
