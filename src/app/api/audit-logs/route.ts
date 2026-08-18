import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, forbidden } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";
import { AuditAction } from "@prisma/client";

const LIMIT_DEFAULT = 50;
const LIMIT_MAX = 100;

export const GET = withAuth(async (req, session) => {
  if (session.user.role !== UserRole.ADMIN) return forbidden();

  const { searchParams } = new URL(req.url);
  const actionParam = searchParams.get("action");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    LIMIT_MAX,
    Math.max(1, parseInt(searchParams.get("limit") ?? String(LIMIT_DEFAULT)) || LIMIT_DEFAULT),
  );

  const where =
    actionParam && actionParam in AuditAction
      ? { action: actionParam as AuditAction }
      : {};

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});
