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

  const { name, active } = await req.json();

  const company = await prisma.company.update({
    where: { id: Number(id) },
    data: { name, active },
    select: { id: true, name: true, active: true },
  });

  return NextResponse.json(company);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") return forbidden();

  await prisma.company.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
