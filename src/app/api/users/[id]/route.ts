import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getAuthSession, forbidden, conflict } from "@/lib/api";

// PATCH — Editar usuario
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") return forbidden();

  const body = await req.json();
  const { name, email, password, role, active, companyId, teamId } = body;

  const data: Record<string, unknown> = {
    name,
    email: email || null,
    role,
    active,
    companyId: Number(companyId),
    teamId: Number(teamId),
  };

  if (email) {
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id: Number(id) } },
    });
    if (existing) return conflict("El email ya está en uso");
  }

  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data,
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

  return NextResponse.json(user);
}

// DELETE — Eliminar usuario
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") return forbidden();

  await prisma.user.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
