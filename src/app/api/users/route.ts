import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { withAuth, forbidden, badRequest, conflict } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { createUserSchema } from "@/lib/validations/user";
import { logAudit, getRequestMeta } from "@/lib/audit";

const LIMIT_DEFAULT = 50;
const LIMIT_MAX = 200;

const userListSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  role: true,
  active: true,
  companyId: true,
  teamId: true,
  avatar: true,
  createdAt: true,
  company: { select: { name: true } },
  team: { select: { name: true } },
} satisfies Prisma.UserSelect;

export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  const roleFilter = searchParams.get("role");

  // Listado de administración (paginado): lo usa la tabla de /users.
  if (searchParams.get("paginated") === "true") {
    if (session.user.role !== UserRole.ADMIN) return forbidden();

    const search = searchParams.get("search")?.trim() || undefined;
    const companyId = searchParams.get("companyId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(
      LIMIT_MAX,
      Math.max(1, parseInt(searchParams.get("limit") ?? String(LIMIT_DEFAULT)) || LIMIT_DEFAULT),
    );

    const where: Prisma.UserWhereInput = {
      ...(companyId ? { companyId: Number(companyId) } : {}),
      ...(teamId ? { teamId: Number(teamId) } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userListSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  }

  // Modo picker (sin paginar): usado por los selects de "asignar a" en leads y recordatorios.
  if (session.user.role !== UserRole.ADMIN && !teamId) return forbidden();

  const users = await prisma.user.findMany({
    where: {
      ...(teamId ? { teamId: Number(teamId), active: true } : {}),
      ...(roleFilter ? { role: roleFilter as Role } : {}),
    },
    select: userListSelect,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
});

export const POST = withAuth(async (req, session) => {
  if (session.user.role !== UserRole.ADMIN) return forbidden();

  const body = await req.json();

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success)
    return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

  const { username, name, email, password, role, companyId } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return conflict("El usuario ya existe");

  // createUserSchema exige password no vacío vía refine (Zod no lo refleja en el tipo)
  const hashed = await bcrypt.hash(password as string, 10);
  const teamId = parsed.data.teamId ? Number(parsed.data.teamId) : null;

  const user = await prisma.user.create({
    data: {
      username,
      name,
      email: email || null,
      password: hashed,
      role,
      companyId: Number(companyId),
      teamId,
    },
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

  await logAudit({
    action: "USER_CREATED",
    actor: { id: session.user.id, role: session.user.role, name: session.user.name },
    entityType: "User",
    entityId: user.id,
    metadata: { role, companyId: Number(companyId), teamId },
    ...getRequestMeta(req),
  });

  return NextResponse.json(user, { status: 201 });
});
