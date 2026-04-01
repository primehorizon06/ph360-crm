import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

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
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { name } = await req.json();
  if (!name)
    return NextResponse.json(
      { error: "El nombre es requerido" },
      { status: 400 },
    );

  const existing = await prisma.company.findFirst({ where: { name } });
  if (existing)
    return NextResponse.json(
      { error: "La franquicia ya existe" },
      { status: 409 },
    );

  const company = await prisma.company.create({
    data: { name },
    select: { id: true, name: true, active: true, createdAt: true },
  });

  return NextResponse.json(company, { status: 201 });
}
