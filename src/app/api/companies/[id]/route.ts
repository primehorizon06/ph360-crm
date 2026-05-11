import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, forbidden } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";

export const PATCH = withAuthParams<{ id: string }>(
  async (req, session, { id }) => {
    if (session.user.role !== UserRole.ADMIN) return forbidden();

    const { name, active } = await req.json();
    const company = await prisma.company.update({
      where: { id: Number(id) },
      data: { name, active },
      select: { id: true, name: true, active: true },
    });

    return NextResponse.json(company);
  },
);

export const DELETE = withAuthParams<{ id: string }>(
  async (_req, session, { id }) => {
    if (session.user.role !== UserRole.ADMIN) return forbidden();

    await prisma.company.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  },
);
