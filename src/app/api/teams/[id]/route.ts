import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, forbidden } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") return forbidden();

  const { name } = await req.json();
  const team = await prisma.team.update({
    where: { id: Number(id) },
    data: { name },
    select: { id: true, name: true, companyId: true },
  });

  return NextResponse.json(team);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") return forbidden();

  await prisma.team.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
