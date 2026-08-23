import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, forbidden, notFound, badRequest } from "@/lib/api";
import { canAccessLead } from "@/lib/permissions";

export const PATCH = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const noteId = Number(id);
  const { pinned } = await req.json();

  if (typeof pinned !== "boolean") return badRequest("El campo pinned es requerido");

  const existing = await prisma.note.findUnique({
    where: { id: noteId },
    include: { lead: { select: { companyId: true, teamId: true, assignedToId: true } } },
  });
  if (!existing) return notFound("Nota no encontrada");
  if (!canAccessLead(session.user, existing.lead)) return forbidden();

  const note = await prisma.$transaction(async (tx) => {
    if (pinned) {
      await tx.note.updateMany({
        where: { leadId: existing.leadId, pinned: true },
        data: { pinned: false },
      });
    }
    return tx.note.update({
      where: { id: noteId },
      data: { pinned },
      select: {
        id: true,
        title: true,
        content: true,
        pinned: true,
        createdAt: true,
        author: { select: { id: true, name: true } },
        attachments: {
          select: { id: true, name: true, url: true, mimeType: true, size: true },
        },
      },
    });
  });

  return NextResponse.json(note);
});
