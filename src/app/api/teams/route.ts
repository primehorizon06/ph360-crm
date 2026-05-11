import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, forbidden, badRequest } from "@/lib/api";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return forbidden();

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
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") return forbidden();

  const { name, companyId } = await req.json();
  if (!name || !companyId) return badRequest("Nombre y franquicia son requeridos");

  const team = await prisma.team.create({
    data: { name, companyId: Number(companyId) },
    select: { id: true, name: true, companyId: true },
  });

  return NextResponse.json(team, { status: 201 });
}
