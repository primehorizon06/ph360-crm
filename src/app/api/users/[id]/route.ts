import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// PATCH — Editar usuario
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

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
    if (existing) {
      return NextResponse.json(
        { error: "El email ya está en uso" },
        { status: 409 },
      );
    }
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
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
