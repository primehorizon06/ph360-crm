import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest, notFound, forbidden } from "@/lib/api";
import { canAccessLead } from "@/lib/permissions";
import { sniffAttachmentType, MAX_ATTACHMENT_SIZE } from "@/lib/fileValidation";
import { saveAttachmentFile, deleteAttachmentFile } from "@/lib/storage";

export const POST = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const note = await prisma.note.findUnique({
    where: { id: Number(id) },
    select: { lead: { select: { companyId: true, teamId: true, assignedToId: true } } },
  });
  if (!note) return notFound("Nota no encontrada");
  if (!canAccessLead(session.user, note.lead)) return forbidden();

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) return badRequest("No se enviaron archivos");

  const attachments = [];

  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_SIZE)
      return badRequest(`Archivo demasiado grande: ${file.name}. Máximo 10MB`);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detected = sniffAttachmentType(buffer);
    if (!detected)
      return badRequest(`Tipo no permitido: ${file.name}. Solo JPEG, PNG, WebP o PDF`);

    const filename = `note-${id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${detected.ext}`;
    const url = await saveAttachmentFile(filename, buffer, detected.mime);

    let attachment;
    try {
      attachment = await prisma.noteAttachment.create({
        data: {
          noteId: Number(id),
          name: file.name,
          url,
          mimeType: detected.mime,
          size: file.size,
        },
      });
    } catch (err) {
      await deleteAttachmentFile(filename).catch(() => {});
      throw err;
    }

    attachments.push({ ...attachment, url: `/api/attachments/${attachment.id}` });
  }

  return NextResponse.json(attachments, { status: 201 });
});
