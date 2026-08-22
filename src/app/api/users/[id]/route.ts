import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withAuthParams, forbidden, conflict, badRequest } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { userSchema } from "@/lib/validations/user";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { optionalField, optionalNumber } from "@/lib/patchFields";

export const PATCH = withAuthParams<{ id: string }>(
  async (req, session, { id }) => {
    if (session.user.role !== UserRole.ADMIN) return forbidden();

    const rawBody = await req.json();
    const parsed = userSchema.safeParse(rawBody);
    if (!parsed.success)
      return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

    const { name, email, password, role, active, companyId, teamId } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!existing) return badRequest("Usuario no encontrado");

    const data: Record<string, unknown> = Object.fromEntries(
      Object.entries({
        name,
        email: optionalField(email),
        role,
        active,
        companyId: Number(companyId),
        teamId: optionalNumber(teamId),
      }).filter(([, value]) => value !== undefined),
    );

    if (email) {
      const emailTaken = await prisma.user.findFirst({
        where: { email, NOT: { id: Number(id) } },
      });
      if (emailTaken) return conflict("El email ya está en uso");
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

    const changedFields = (Object.keys(data) as Array<keyof typeof data>).filter(
      (key) => (existing as Record<string, unknown>)[key] !== data[key],
    );

    await logAudit({
      action: "USER_UPDATED",
      actor: { id: session.user.id, role: session.user.role, name: session.user.name },
      entityType: "User",
      entityId: user.id,
      metadata: { changedFields, roleChangedTo: existing.role !== role ? role : undefined },
      ...getRequestMeta(req),
    });

    return NextResponse.json(user);
  },
);
