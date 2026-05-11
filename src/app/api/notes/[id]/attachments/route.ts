import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { withAuthParams, badRequest } from "@/lib/api";

export const POST = withAuthParams<{ id: string }>(async (req, _session, { id }) => {
  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) return badRequest("No se enviaron archivos");

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const attachments = [];

  for (const file of files) {
    if (!allowedTypes.includes(file.type))
      return badRequest(`Tipo no permitido: ${file.name}`);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop();
    const filename = `note-${id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public/uploads/notes");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    const attachment = await prisma.noteAttachment.create({
      data: {
        noteId: Number(id),
        name: file.name,
        url: `/uploads/notes/${filename}`,
        mimeType: file.type,
        size: file.size,
      },
    });

    attachments.push(attachment);
  }

  return NextResponse.json(attachments, { status: 201 });
});
