import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, forbidden, badRequest, conflict } from "@/lib/api";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return forbidden();

  const { searchParams } = new URL(req.url);
  const simple = searchParams.get("simple"); // ?simple=true para el modal de usuarios

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
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") return forbidden();

  const { name } = await req.json();
  if (!name) return badRequest("El nombre es requerido");

  const existing = await prisma.company.findFirst({ where: { name } });
  if (existing) return conflict("La franquicia ya existe");

  const company = await prisma.company.create({
    data: { name },
    select: { id: true, name: true, active: true, createdAt: true },
  });

  return NextResponse.json(company, { status: 201 });
}
