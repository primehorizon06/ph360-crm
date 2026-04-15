import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

// GET — Listar usuarios (solo ADMIN)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  const roleFilter = searchParams.get("role");

  // Solo ADMIN puede ver todos los usuarios
  // Otros roles solo pueden consultar agentes para asignar leads
  if (session.user.role !== "ADMIN" && !teamId) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: {
      ...(teamId ? { teamId: Number(teamId) } : {}),
      ...(roleFilter ? { role: roleFilter as Role } : {}),
    },
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
  const { username, name, email, password, role, companyId } = body;

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
  const teamId = body.teamId ? Number(body.teamId) : null;

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

  return NextResponse.json(user, { status: 201 });
}
