import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, forbidden } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";

export const PATCH = withAuthParams<{ id: string }>(
  async (req, session, { id }) => {
    if (session.user.role !== UserRole.ADMIN) return forbidden();

    const { name } = await req.json();
    const team = await prisma.team.update({
      where: { id: Number(id) },
      data: { name },
      select: { id: true, name: true, companyId: true },
    });

    return NextResponse.json(team);
  },
);

export const DELETE = withAuthParams<{ id: string }>(
  async (_req, session, { id }) => {
    if (session.user.role !== UserRole.ADMIN) return forbidden();

    await prisma.team.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  },
);
