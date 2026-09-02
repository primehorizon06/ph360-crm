import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, notFound, forbidden } from "@/lib/api";
import { canAccessLead } from "@/lib/permissions";
import { readAttachmentFile } from "@/lib/storage";

export const GET = withAuthParams<{ id: string }>(async (_req, session, { id }) => {
  const attachment = await prisma.noteAttachment.findUnique({
    where: { id: Number(id) },
    select: {
      url: true,
      name: true,
      mimeType: true,
      note: { select: { lead: { select: { companyId: true, teamId: true, assignedToId: true } } } },
    },
  });
  if (!attachment) return notFound();

  if (!canAccessLead(session.user, attachment.note.lead)) return forbidden();

  const file = await readAttachmentFile(attachment.url);

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": attachment.mimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.name)}"`,
      "Cache-Control": "private, no-store",
    },
  });
});
