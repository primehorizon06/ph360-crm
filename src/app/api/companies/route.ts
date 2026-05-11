import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, forbidden, badRequest, conflict } from "@/lib/api";
import { UserRole } from "@/utils/constants/roles";

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const simple = searchParams.get("simple");

  const companies = await prisma.company.findMany({
    select: simple
      ? { id: true, name: true }
      : {
          id: true,
          name: true,
          active: true,
          createdAt: true,
          _count: { select: { teams: true, users: true } },
        },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(companies);
});

export const POST = withAuth(async (req, session) => {
  if (session.user.role !== UserRole.ADMIN) return forbidden();

  const { name } = await req.json();
  if (!name) return badRequest("El nombre es requerido");

  const existing = await prisma.company.findFirst({ where: { name } });
  if (existing) return conflict("La franquicia ya existe");

  const company = await prisma.company.create({
    data: { name },
    select: { id: true, name: true, active: true, createdAt: true },
  });

  return NextResponse.json(company, { status: 201 });
});
