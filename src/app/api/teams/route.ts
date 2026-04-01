import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

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
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { name, companyId } = await req.json();
  if (!name || !companyId) {
    return NextResponse.json(
      { error: "Nombre y franquicia son requeridos" },
      { status: 400 },
    );
  }

  const team = await prisma.team.create({
    data: { name, companyId: Number(companyId) },
    select: { id: true, name: true, companyId: true },
  });

  return NextResponse.json(team, { status: 201 });
}
