import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { getAuthSession, forbidden, badRequest, conflict } from "@/lib/api";

// GET — Listar usuarios (solo ADMIN)
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return forbidden();

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  const roleFilter = searchParams.get("role");

  // Solo ADMIN puede ver todos los usuarios
  // Otros roles solo pueden consultar agentes para asignar leads
  if (session.user.role !== "ADMIN" && !teamId) return forbidden();

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
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") return forbidden();

  const body = await req.json();
  const { username, name, email, password, role, companyId } = body;

  if (!username || !name || !password || !role) return badRequest("Campos requeridos faltantes");

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return conflict("El usuario ya existe");

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
