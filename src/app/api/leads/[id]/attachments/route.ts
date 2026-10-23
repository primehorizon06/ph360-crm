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
import { ATTACHMENTS_NOTE_TITLE } from "@/utils/constants/notes";

export const POST = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const lead = await prisma.lead.findUnique({ where: { id: Number(id) } });
  if (!lead) return notFound("Lead no encontrado");
  if (!canAccessLead(session.user, lead)) return forbidden();

  const uploads = await readAttachmentUploads(req);

  const note = await withStoredAttachments(`lead-${lead.id}`, uploads, (stored) =>
    prisma.note.create({
      data: {
        leadId: lead.id,
        authorId: Number(session.user.id),
        title: ATTACHMENTS_NOTE_TITLE,
        content: `<p>${uploads.length === 1 ? "Archivo subido" : "Archivos subidos"} desde la pestaña Adjuntos.</p>`,
        attachments: { create: stored },
      },
      select: { id: true, attachments: true },
    }),
  );

  await logAudit({
    action: "ATTACHMENTS_UPLOADED",
    actor: auditActor(session.user),
    entityType: "Lead",
    entityId: lead.id,
    metadata: { noteId: note.id, count: uploads.length, mimeTypes: uploads.map((u) => u.mime) },
    ...getRequestMeta(req),
  });

  return NextResponse.json(note.attachments.map(attachmentResponse), { status: 201 });
});
