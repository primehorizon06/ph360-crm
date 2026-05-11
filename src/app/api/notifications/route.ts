import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, unauthorized, badRequest } from "@/lib/api";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const notifications = await prisma.notification.findMany({
    where: {
      userId: Number(session.user.id),
      read: false,
    },
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      leadId: true,
      productId: true,
      read: true,
      createdAt: true,
      lead: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const transformed = notifications.map((n) => ({
    ...n,
    lead: {
      ...n.lead,
      fullName: `${n.lead.firstName} ${n.lead.lastName ?? ""}`.trim(),
    },
  }));

  return NextResponse.json(transformed);
}

export async function PATCH(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const { id, readAll } = await req.json();

  // Marcar todas como leídas
  if (readAll) {
    await prisma.notification.updateMany({
      where: { userId: Number(session.user.id), read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  // Marcar una como leída
  if (!id) return badRequest("ID requerido");

  const updated = await prisma.notification.update({
    where: { id: Number(id) },
    data: { read: true },
  });

  return NextResponse.json(updated);
}
