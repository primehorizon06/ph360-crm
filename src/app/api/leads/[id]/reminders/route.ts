import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest, forbidden, notFound } from "@/lib/api";
import { canAccessLead } from "@/lib/permissions";
import { isValidReminderAssignee } from "@/lib/leadService";

export const GET = withAuthParams<{ id: string }>(async (_req, session, { id }) => {
  const lead = await prisma.lead.findUnique({ where: { id: Number(id) } });
  if (!lead) return notFound("Lead no encontrado");
  if (!canAccessLead(session.user, lead)) return forbidden();

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
});

export const POST = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const { scheduledAt, reason, assignedToId } = await req.json();
  if (!scheduledAt || !reason || !assignedToId)
    return badRequest("Todos los campos son requeridos");

  const lead = await prisma.lead.findUnique({ where: { id: Number(id) } });
  if (!lead) return notFound("Lead no encontrado");
  if (!canAccessLead(session.user, lead)) return forbidden();

  if (!(await isValidReminderAssignee(Number(assignedToId), lead.companyId)))
    return badRequest("El responsable no pertenece a la franquicia del lead");

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
});
