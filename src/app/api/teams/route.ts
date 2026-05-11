import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, forbidden, badRequest } from "@/lib/api";

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  const teams = await prisma.team.findMany({
    where: companyId ? { companyId: Number(companyId) } : undefined,
    select: {
      id: true,
      name: true,
      companyId: true,
      _count: { select: { users: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(teams);
});

export const POST = withAuth(async (req, session) => {
  if (session.user.role !== "ADMIN") return forbidden();

  const { name, companyId } = await req.json();
  if (!name || !companyId) return badRequest("Nombre y franquicia son requeridos");

  const team = await prisma.team.create({
    data: { name, companyId: Number(companyId) },
    select: { id: true, name: true, companyId: true },
  });

  return NextResponse.json(team, { status: 201 });
});
