import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, badRequest } from "@/lib/api";

export const GET = withAuth(async (_req, session) => {
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
});

export const PATCH = withAuth(async (req, session) => {
  const { id, readAll } = await req.json();

  if (readAll) {
    await prisma.notification.updateMany({
      where: { userId: Number(session.user.id), read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (!id) return badRequest("ID requerido");

  const updated = await prisma.notification.update({
    where: { id: Number(id) },
    data: { read: true },
  });

  return NextResponse.json(updated);
});
