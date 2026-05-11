import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthParams, badRequest } from "@/lib/api";

export const GET = withAuthParams<{ id: string }>(async (_req, _session, { id }) => {
  const notes = await prisma.note.findMany({
    where: { leadId: Number(id) },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
      attachments: {
        select: {
          id: true,
          name: true,
          url: true,
          mimeType: true,
          size: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
});

export const POST = withAuthParams<{ id: string }>(async (req, session, { id }) => {
  const { title, content } = await req.json();
  if (!title || !content) return badRequest("Título y contenido son requeridos");

  const note = await prisma.note.create({
    data: {
      title,
      content,
      leadId: Number(id),
      authorId: Number(session.user.id),
    },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(note, { status: 201 });
});
