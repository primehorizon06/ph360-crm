import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, forbidden } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { logAudit, getRequestMeta } from "@/lib/audit";

export const PATCH = withAuthParams<{ id: string }>(
  async (req, session, { id }) => {
    if (session.user.role !== UserRole.ADMIN) return forbidden();

    const { name, active } = await req.json();
    const company = await prisma.company.update({
      where: { id: Number(id) },
      data: { name, active },
      select: { id: true, name: true, active: true },
    });

    await logAudit({
      action: "COMPANY_UPDATED",
      actor: { id: session.user.id, role: session.user.role, name: session.user.name },
      entityType: "Company",
      entityId: company.id,
      metadata: { name, active },
      ...getRequestMeta(req),
    });

    return NextResponse.json(company);
  },
);

export const DELETE = withAuthParams<{ id: string }>(
  async (req, session, { id }) => {
    if (session.user.role !== UserRole.ADMIN) return forbidden();

    const existing = await prisma.company.findUnique({ where: { id: Number(id) } });

    await prisma.company.delete({ where: { id: Number(id) } });

    await logAudit({
      action: "COMPANY_DELETED",
      actor: { id: session.user.id, role: session.user.role, name: session.user.name },
      entityType: "Company",
      entityId: Number(id),
      metadata: { name: existing?.name },
      ...getRequestMeta(req),
    });

    return NextResponse.json({ success: true });
  },
);
