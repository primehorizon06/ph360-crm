import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withAuthParams, forbidden, conflict, badRequest } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { userSchema } from "@/lib/validations/user";

export const PATCH = withAuthParams<{ id: string }>(
  async (req, session, { id }) => {
    if (session.user.role !== UserRole.ADMIN) return forbidden();

    const rawBody = await req.json();
    const parsed = userSchema.safeParse(rawBody);
    if (!parsed.success)
      return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

    const { name, email, password, role, active, companyId, teamId } = parsed.data;

    const data: Record<string, unknown> = {
      name,
      email: email || null,
      role,
      active,
      companyId: Number(companyId),
      teamId: Number(teamId),
    };

    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id: Number(id) } },
      });
      if (existing) return conflict("El email ya está en uso");
    }

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
        company: { select: { name: true } },
        team: { select: { name: true } },
      },
    });

    return NextResponse.json(user);
  },
);

export const DELETE = withAuthParams<{ id: string }>(
  async (_req, session, { id }) => {
    if (session.user.role !== UserRole.ADMIN) return forbidden();

    await prisma.user.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  },
);
