import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { withAuthParams, badRequest } from "@/lib/api";
import { sniffAttachmentType, MAX_ATTACHMENT_SIZE } from "@/lib/fileValidation";

export const POST = withAuthParams<{ id: string }>(async (req, _session, { id }) => {
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
    const uploadDir = path.join(process.cwd(), "public/uploads/notes");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    const attachment = await prisma.noteAttachment.create({
      data: {
        noteId: Number(id),
        name: file.name,
        url: `/uploads/notes/${filename}`,
        mimeType: detected.mime,
        size: file.size,
      },
    });

    attachments.push(attachment);
  }

  return NextResponse.json(attachments, { status: 201 });
});
