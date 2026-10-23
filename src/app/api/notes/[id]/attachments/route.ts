import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, notFound, forbidden } from "@/lib/api";
import { canAccessLead } from "@/lib/permissions";
import { logAudit, getRequestMeta, auditActor } from "@/lib/audit";
import {
  readAttachmentUploads,
  withStoredAttachments,
  attachmentResponse,
} from "@/lib/noteAttachments";

export const POST = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const noteId = Number(id);
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: {
      leadId: true,
      lead: { select: { companyId: true, teamId: true, assignedToId: true } },
    },
  });
  if (!note) return notFound("Nota no encontrada");
  if (!canAccessLead(session.user, note.lead)) return forbidden();

  const uploads = await readAttachmentUploads(req);

  const attachments = await withStoredAttachments(`note-${noteId}`, uploads, (stored) =>
    prisma.$transaction(
      stored.map((data) => prisma.noteAttachment.create({ data: { ...data, noteId } })),
    ),
  );

  await logAudit({
    action: "ATTACHMENTS_UPLOADED",
    actor: auditActor(session.user),
    entityType: "Lead",
    entityId: note.leadId,
    metadata: { noteId, count: uploads.length, mimeTypes: uploads.map((u) => u.mime) },
    ...getRequestMeta(req),
  });

  return NextResponse.json(attachments.map(attachmentResponse), { status: 201 });
});
