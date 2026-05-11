import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams } from "@/lib/api";

export const GET = withAuthParams<{ id: string }>(async (_req, _session, { id }) => {
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
    author: note.author,
  }));

  return NextResponse.json(flat);
});
