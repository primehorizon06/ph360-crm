import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, notFound, forbidden } from "@/lib/api";
import { canAccessLead } from "@/lib/permissions";

export const GET = withAuthParams<{ id: string }>(async (_req, session, { id }) => {
  const lead = await prisma.lead.findUnique({ where: { id: Number(id) } });
  if (!lead) return notFound("Lead no encontrado");
  if (!canAccessLead(session.user, lead)) return forbidden();

  const attachments = await prisma.noteAttachment.findMany({
    where: {
      note: {
        leadId: Number(id),
      },
    },
    select: {
      id: true,
      name: true,
      url: true,
      mimeType: true,
      size: true,
      createdAt: true,
      note: {
        select: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const flat = attachments.map(({ note, ...att }) => ({
    ...att,
    url: `/api/attachments/${att.id}`,
    author: note.author,
  }));

  return NextResponse.json(flat);
});
