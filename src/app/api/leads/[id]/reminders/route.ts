import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, forbidden, badRequest } from "@/lib/api";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session) return forbidden();

  const reminders = await prisma.reminder.findMany({
    where: { leadId: Number(id) },
    select: {
      id: true,
      scheduledAt: true,
      reason: true,
      createdAt: true,
      assignedTo: { select: { id: true, name: true, role: true } },
      createdBy: { select: { id: true, name: true } },
      status: true,
      leadId: true,
      lead: { select: { id: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });
  
  return NextResponse.json(reminders);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session) return forbidden();

  const { scheduledAt, reason, assignedToId } = await req.json();
  if (!scheduledAt || !reason || !assignedToId)
    return badRequest("Todos los campos son requeridos");

  const reminder = await prisma.reminder.create({
    data: {
      leadId: Number(id),
      scheduledAt: new Date(scheduledAt),
      reason,
      assignedToId: Number(assignedToId),
      createdById: Number(session.user.id),
    },
    select: {
      id: true,
      scheduledAt: true,
      reason: true,
      createdAt: true,
      assignedTo: { select: { id: true, name: true, role: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(reminder, { status: 201 });
}
