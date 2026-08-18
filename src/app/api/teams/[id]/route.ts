import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, forbidden } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { logAudit, getRequestMeta } from "@/lib/audit";

export const PATCH = withAuthParams<{ id: string }>(
  async (req, session, { id }) => {
    if (session.user.role !== UserRole.ADMIN) return forbidden();

    const { name } = await req.json();
    const team = await prisma.team.update({
      where: { id: Number(id) },
      data: { name },
      select: { id: true, name: true, companyId: true },
    });

    await logAudit({
      action: "TEAM_UPDATED",
      actor: { id: session.user.id, role: session.user.role, name: session.user.name },
      entityType: "Team",
      entityId: team.id,
      metadata: { name },
      ...getRequestMeta(req),
    });

    return NextResponse.json(team);
  },
);

export const DELETE = withAuthParams<{ id: string }>(
  async (req, session, { id }) => {
    if (session.user.role !== UserRole.ADMIN) return forbidden();

    const existing = await prisma.team.findUnique({ where: { id: Number(id) } });

    await prisma.team.delete({ where: { id: Number(id) } });

    await logAudit({
      action: "TEAM_DELETED",
      actor: { id: session.user.id, role: session.user.role, name: session.user.name },
      entityType: "Team",
      entityId: Number(id),
      metadata: { name: existing?.name, companyId: existing?.companyId },
      ...getRequestMeta(req),
    });

    return NextResponse.json({ success: true });
  },
);
