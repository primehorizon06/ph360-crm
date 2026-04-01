import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET — Listar usuarios (solo ADMIN)
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
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
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

// POST — Crear usuario (solo ADMIN)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const { username, name, email, password, role, companyId, teamId } = body;

  if (!username || !name || !password || !role) {
    return NextResponse.json(
      { error: "Campos requeridos faltantes" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json(
      { error: "El usuario ya existe" },
      { status: 409 },
    );
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      name,
      email: email || null,
      password: hashed,
      role,
      companyId: companyId || null,
      teamId: teamId || null,
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

  return NextResponse.json(user, { status: 201 });
}
